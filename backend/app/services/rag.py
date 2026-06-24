import json
import time
from dataclasses import dataclass
from typing import Any, Iterator

from app.core.config import settings
from app.models.documents import DocumentSummary
from app.models.query import Citation, QueryResponse
from app.services.ingestion import PdfIngestionService


class GroqRateLimitError(Exception):
    def __init__(self, retry_after: str | None = None) -> None:
        self.retry_after = retry_after
        super().__init__("Groq rate limit exceeded")


class RagConfigurationError(Exception):
    pass


@dataclass
class RetrievedChunk:
    text: str
    filename: str
    page: int
    chunk_index: int


class RagService:
    def __init__(self) -> None:
        import chromadb

        # Use PersistentClient so ChromaDB runs embedded in-process.
        # No separate Chroma server or Docker needed.
        self._chroma_client = chromadb.PersistentClient(
            path="./chroma_data",
        )
        self._docs_collection = self._chroma_client.get_or_create_collection(
            settings.chroma_collection,
        )
        self._uploads_collection = self._chroma_client.get_or_create_collection(
            settings.chroma_uploads_collection,
        )
        self._llama_index_configured = False

    def _configure_llama_index(self, api_key: str | None = None, model: str | None = None) -> None:
        from llama_index.core import Settings as LlamaIndexSettings
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        from llama_index.llms.groq import Groq

        resolved_key = api_key or settings.groq_api_key
        resolved_model = model or settings.groq_model

        if not resolved_key:
            raise RagConfigurationError("GROQ_API_KEY is not configured")

        if not getattr(self, "_embeddings_configured", False):
            LlamaIndexSettings.embed_model = HuggingFaceEmbedding(
                model_name=settings.embedding_model_name,
            )
            self._embeddings_configured = True

        LlamaIndexSettings.llm = Groq(
            model=resolved_model,
            api_key=resolved_key,
        )
        self._llama_index_configured = True

    def answer_question(self, question: str, top_k: int, api_key: str | None = None, model: str | None = None, filename: str | None = None) -> QueryResponse:
        chunks = self._retrieve_chunks(question=question, top_k=top_k, api_key=api_key, model=model, filename=filename)
        if not chunks:
            return QueryResponse(
                answer="I don't have enough information in the uploaded documents",
                citations=[],
                confidence=0.0,
            )

        return self._answer_from_chunks(question=question, chunks=chunks, api_key=api_key, model=model)

    def stream_answer(
        self,
        question: str,
        top_k: int,
        api_key: str | None = None,
        model: str | None = None,
        filename: str | None = None,
    ) -> tuple[list[Citation], Iterator[str]]:
        from llama_index.core import Settings as LlamaIndexSettings

        chunks = self._retrieve_chunks(question=question, top_k=top_k, api_key=api_key, model=model, filename=filename)
        citations = self._citations_from_chunks(chunks)

        if not chunks:
            return citations, iter(["I don't have enough information in the uploaded documents"])

        self._configure_llama_index(api_key=api_key, model=model)
        prompt = self._build_streaming_prompt(question=question, chunks=chunks)
        streaming_response = LlamaIndexSettings.llm.stream_complete(prompt)

        def token_iterator() -> Iterator[str]:
            for token in streaming_response:
                delta = getattr(token, "delta", "")
                if not delta:
                    continue
                if settings.stream_artificial_delay_ms > 0:
                    time.sleep(settings.stream_artificial_delay_ms / 1000)
                yield delta

        return citations, token_iterator()

    def _answer_from_chunks(
        self,
        question: str,
        chunks: list[RetrievedChunk],
        api_key: str | None = None,
        model: str | None = None,
    ) -> QueryResponse:
        from llama_index.core import Settings as LlamaIndexSettings

        self._configure_llama_index(api_key=api_key, model=model)
        prompt = self._build_query_prompt(question=question, chunks=chunks)

        try:
            # LlamaIndex routes this completion call through the configured Groq LLM.
            completion = LlamaIndexSettings.llm.complete(prompt)
        except Exception as exc:
            if self._is_rate_limit_error(exc):
                raise GroqRateLimitError(retry_after=self._retry_after(exc)) from exc
            raise

        return self._parse_response(str(completion), chunks)

    def list_documents(self) -> list[DocumentSummary]:
        uploads = self._uploads_collection.get()
        documents: list[DocumentSummary] = []

        for filename, metadata in zip(
            uploads.get("documents", []),
            uploads.get("metadatas", []),
        ):
            metadata = metadata or {}
            documents.append(
                DocumentSummary(
                    filename=str(metadata.get("filename") or filename),
                    chunks_stored=int(metadata.get("chunks_stored") or 0),
                    upload_timestamp=metadata.get("upload_timestamp"),
                )
            )

        return sorted(documents, key=lambda item: item.filename.lower())

    def delete_document(self, filename: str) -> int:
        filename_hash = PdfIngestionService.hash_filename(filename)
        existing = self._docs_collection.get(where={"filename_hash": filename_hash})
        chunk_ids = existing.get("ids", [])

        if chunk_ids:
            self._docs_collection.delete(ids=chunk_ids)

        self._uploads_collection.delete(ids=[filename_hash])
        return len(chunk_ids)

    def _retrieve_chunks(self, question: str, top_k: int, api_key: str | None = None, model: str | None = None, filename: str | None = None) -> list[RetrievedChunk]:
        self._configure_llama_index(api_key=api_key, model=model)
        from llama_index.core import VectorStoreIndex
        from llama_index.vector_stores.chroma import ChromaVectorStore
        from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter

        # Retrieval: wrap the existing persistent Chroma collection as a LlamaIndex vector store.
        vector_store = ChromaVectorStore(chroma_collection=self._docs_collection)
        index = VectorStoreIndex.from_vector_store(vector_store)
        
        filters = None
        if filename:
            filters = MetadataFilters(filters=[ExactMatchFilter(key="filename", value=filename)])
            
        retriever = index.as_retriever(similarity_top_k=top_k, filters=filters)
        nodes = retriever.retrieve(question)

        chunks: list[RetrievedChunk] = []
        for node_with_score in nodes:
            node = node_with_score.node
            metadata = node.metadata or {}
            chunks.append(
                RetrievedChunk(
                    text=node.get_content(metadata_mode="none"),
                    filename=str(metadata.get("filename") or "unknown"),
                    page=int(metadata.get("page_number") or 0),
                    chunk_index=int(metadata.get("chunk_index") or 0),
                )
            )

        return chunks

    def _build_query_prompt(self, question: str, chunks: list[RetrievedChunk]) -> str:
        context_blocks = []
        for index, chunk in enumerate(chunks, start=1):
            context_blocks.append(
                "\n".join(
                    [
                        f"CHUNK {index}",
                        f"filename: {chunk.filename}",
                        f"page: {chunk.page}",
                        f"chunk_index: {chunk.chunk_index}",
                        f"text: {chunk.text}",
                    ]
                )
            )

        context = "\n\n---\n\n".join(context_blocks)

        return f"""
You are DocMind AI, a document-grounded question answering assistant.

Rules:
- ONLY answer from the provided context chunks.
- If the context is insufficient, answer exactly: "I don't have enough information in the uploaded documents".
- Return valid JSON only. Do not wrap it in markdown.
- The JSON must match this exact schema:
  {{
    "answer": "...",
    "citations": [
      {{
        "filename": "...",
        "page": 1,
        "chunk_excerpt": "..."
      }}
    ],
    "confidence": 0.0
  }}
- Confidence must be a number from 0.0 to 1.0.
- Citations must cite only chunks used to answer.

Question:
{question}

Context chunks:
{context}
""".strip()

    def _build_streaming_prompt(self, question: str, chunks: list[RetrievedChunk]) -> str:
        context_blocks = []
        for index, chunk in enumerate(chunks, start=1):
            context_blocks.append(
                "\n".join(
                    [
                        f"CHUNK {index}",
                        f"filename: {chunk.filename}",
                        f"page: {chunk.page}",
                        f"chunk_index: {chunk.chunk_index}",
                        f"text: {chunk.text}",
                    ]
                )
            )

        context = "\n\n---\n\n".join(context_blocks)

        return f"""
You are DocMind AI, a document-grounded question answering assistant.

Rules:
- ONLY answer from the provided context chunks.
- If the context is insufficient, answer exactly: "I don't have enough information in the uploaded documents".
- Return plain text only.
- Keep the answer concise, accurate, and directly grounded in the context.

Question:
{question}

Context chunks:
{context}
""".strip()

    def _citations_from_chunks(self, chunks: list[RetrievedChunk]) -> list[Citation]:
        citations: list[Citation] = []
        for chunk in chunks:
            citations.append(
                Citation(
                    filename=chunk.filename,
                    page=chunk.page,
                    chunk_excerpt=chunk.text[:240],
                )
            )
        return citations

    def _parse_response(self, raw_text: str, chunks: list[RetrievedChunk]) -> QueryResponse:
        try:
            payload = json.loads(self._extract_json(raw_text))
            return QueryResponse(**payload)
        except Exception:
            return QueryResponse(
                answer="I don't have enough information in the uploaded documents",
                citations=[
                    Citation(
                        filename=chunk.filename,
                        page=chunk.page,
                        chunk_excerpt=chunk.text[:240],
                    )
                    for chunk in chunks[:2]
                ],
                confidence=0.0,
            )

    def _extract_json(self, raw_text: str) -> str:
        stripped = raw_text.strip()
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return stripped
        return stripped[start : end + 1]

    def _is_rate_limit_error(self, exc: Exception) -> bool:
        status_code = getattr(exc, "status_code", None)
        response = getattr(exc, "response", None)
        response_status = getattr(response, "status_code", None)
        return (
            status_code == 429
            or response_status == 429
            or "rate limit" in str(exc).lower()
        )

    def _retry_after(self, exc: Exception) -> str | None:
        response = getattr(exc, "response", None)
        headers: Any = getattr(response, "headers", None)
        if headers is None:
            return None
        return headers.get("retry-after") or headers.get("Retry-After")
