import json
import math
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

from pydantic import BaseModel, Field, ValidationError

from app.core.embeddings import resolve_embedding_model_path
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


class LLMCitation(BaseModel):
    filename: str = Field(min_length=1)
    page: int = Field(ge=0)
    chunk_excerpt: str = Field(min_length=1)


class LLMQueryResponse(BaseModel):
    answer: str = Field(min_length=1)
    citations: list[LLMCitation] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


@dataclass
class RetrievedChunk:
    text: str
    filename: str
    page: int
    chunk_index: int
    fused_score: float = 0.0


class RagService:
    def __init__(self) -> None:
        import chromadb
        from sentence_transformers import SentenceTransformer

        self._data_dir = Path(__file__).resolve().parents[2] / "chroma_data"
        self._data_dir.mkdir(parents=True, exist_ok=True)

        self._chroma_client = chromadb.PersistentClient(path=str(self._data_dir))
        self._docs_collection = self._chroma_client.get_or_create_collection(
            settings.chroma_collection,
        )
        self._uploads_collection = self._chroma_client.get_or_create_collection(
            settings.chroma_uploads_collection,
        )
        self._embedder = SentenceTransformer(
            resolve_embedding_model_path(),
        )
        self._llm = None

    def _configure_llm(self):
        if self._llm is not None:
            return self._llm

        if not settings.groq_api_key:
            raise RagConfigurationError("GROQ_API_KEY is not configured")

        from langchain_groq import ChatGroq

        self._llm = ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0,
        )
        return self._llm

    def answer_question(self, question: str, top_k: int) -> QueryResponse:
        chunks = self._retrieve_chunks(question=question, top_k=top_k)
        if not chunks:
            return QueryResponse(
                answer="I don't have enough information in the uploaded documents",
                citations=[],
                confidence=0.0,
            )

        return self._answer_from_chunks(question=question, chunks=chunks)

    def stream_answer(
        self,
        question: str,
        top_k: int,
    ) -> tuple[list[Citation], Iterator[str]]:
        chunks = self._retrieve_chunks(question=question, top_k=top_k)
        citations = self._citations_from_chunks(chunks)

        if not chunks:
            return citations, iter(["I don't have enough information in the uploaded documents"])

        llm = self._configure_llm()
        prompt = self._build_streaming_prompt(question=question, chunks=chunks)
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = [
            SystemMessage(content="You are DocMind AI, a document-grounded assistant."),
            HumanMessage(content=prompt),
        ]
        streaming_response = llm.stream(messages)

        def token_iterator() -> Iterator[str]:
            for token in streaming_response:
                delta = getattr(token, "content", "")
                if not delta:
                    continue
                if settings.stream_artificial_delay_ms > 0:
                    time.sleep(settings.stream_artificial_delay_ms / 1000)
                yield str(delta)

        return citations, token_iterator()

    def _answer_from_chunks(
        self,
        question: str,
        chunks: list[RetrievedChunk],
    ) -> QueryResponse:
        llm = self._configure_llm()
        prompt = self._build_query_prompt(question=question, chunks=chunks)

        from langchain_core.messages import HumanMessage, SystemMessage

        messages = [
            SystemMessage(
                content=(
                    "You are DocMind AI, a document-grounded question answering assistant. "
                    "Answer only from the provided context."
                )
            ),
            HumanMessage(content=prompt),
        ]

        try:
            completion = llm.invoke(messages)
        except Exception as exc:
            if self._is_rate_limit_error(exc):
                raise GroqRateLimitError(retry_after=self._retry_after(exc)) from exc
            raise

        raw_text = getattr(completion, "content", str(completion))
        return self._parse_response(str(raw_text), chunks)

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

    def _retrieve_chunks(self, question: str, top_k: int) -> list[RetrievedChunk]:
        candidate_count = max(
            top_k * max(1, int(settings.retrieval_candidate_multiplier)),
            int(settings.retrieval_min_candidates),
        )

        query_embedding = self._embedder.encode(
            [question],
            normalize_embeddings=True,
            show_progress_bar=False,
        )[0].tolist()

        results = self._docs_collection.query(
            query_embeddings=[query_embedding],
            n_results=candidate_count,
            include=["documents", "metadatas", "distances"],
        )

        documents = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]

        candidates: list[RetrievedChunk] = []
        for index, (document, metadata) in enumerate(zip(documents, metadatas)):
            metadata = metadata or {}
            candidates.append(
                RetrievedChunk(
                    text=str(document or ""),
                    filename=str(metadata.get("filename") or "unknown"),
                    page=int(metadata.get("page_number") or 0),
                    chunk_index=int(metadata.get("chunk_index") or 0),
                    fused_score=0.0,
                )
            )

        if not candidates:
            return []

        dense_ranks = {self._candidate_key(chunk): rank for rank, chunk in enumerate(candidates, start=1)}
        bm25_ranks = self._bm25_ranks(question=question, chunks=candidates)

        ranked: list[RetrievedChunk] = []
        for chunk in candidates:
            key = self._candidate_key(chunk)
            dense_rank = dense_ranks.get(key, len(candidates))
            lexical_rank = bm25_ranks.get(key, len(candidates))
            fused_score = (1.0 / (settings.retrieval_rrf_k + dense_rank)) + (
                1.0 / (settings.retrieval_rrf_k + lexical_rank)
            )
            chunk.fused_score = fused_score
            ranked.append(chunk)

        ranked.sort(
            key=lambda item: (
                -item.fused_score,
                dense_ranks.get(self._candidate_key(item), len(candidates)),
                self._candidate_text_length(item),
            )
        )

        return ranked[:top_k]

    def _bm25_ranks(self, question: str, chunks: list[RetrievedChunk]) -> dict[str, int]:
        query_terms = self._tokenize(question)
        if not query_terms:
            return {self._candidate_key(chunk): rank for rank, chunk in enumerate(chunks, start=1)}

        doc_tokens = [self._tokenize(chunk.text) for chunk in chunks]
        doc_freq: dict[str, int] = {}
        for tokens in doc_tokens:
            for term in set(tokens):
                doc_freq[term] = doc_freq.get(term, 0) + 1

        avg_doc_len = sum(len(tokens) for tokens in doc_tokens) / max(len(doc_tokens), 1)
        k1 = 1.5
        b = 0.75

        scores: list[tuple[str, float]] = []
        for chunk, tokens in zip(chunks, doc_tokens):
            score = 0.0
            doc_len = len(tokens) or 1
            token_counts: dict[str, int] = {}
            for token in tokens:
                token_counts[token] = token_counts.get(token, 0) + 1

            for term in query_terms:
                tf = token_counts.get(term, 0)
                if tf == 0:
                    continue
                df = doc_freq.get(term, 0)
                if df == 0:
                    continue
                idf = math.log(1 + ((len(chunks) - df + 0.5) / (df + 0.5)))
                denom = tf + k1 * (1 - b + b * (doc_len / max(avg_doc_len, 1e-9)))
                score += idf * (tf * (k1 + 1)) / denom

            scores.append((self._candidate_key(chunk), score))

        scores.sort(key=lambda item: item[1], reverse=True)
        return {key: rank for rank, (key, _) in enumerate(scores, start=1)}

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"\b\w+\b", text.lower())

    def _candidate_key(self, chunk: RetrievedChunk) -> str:
        return f"{chunk.filename}:{chunk.page}:{chunk.chunk_index}"

    def _candidate_text_length(self, chunk: RetrievedChunk) -> int:
        return len(chunk.text)

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
Rules:
- ONLY answer from the provided context chunks.
- If the context is insufficient, answer exactly: "I don't have enough information in the uploaded documents".
- Return valid JSON only. Do not wrap it in markdown.
- The JSON must contain exactly these keys: answer, citations, confidence.
- citations must be a JSON array of objects with filename, page, and chunk_excerpt.
- confidence must be a decimal between 0.0 and 1.0.
- If you cannot support the answer from the context, return the insufficient-information sentence with confidence 0.0 and an empty citations array.

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
            structured = LLMQueryResponse.model_validate(payload)
            return self._finalize_response(structured)
        except (json.JSONDecodeError, ValidationError, TypeError, ValueError):
            return self._fallback_response(
                chunks=chunks,
                answer="I don't have enough information in the uploaded documents",
                confidence=0.0,
            )
        except Exception:
            return self._fallback_response(
                chunks=chunks,
                answer="I don't have enough information in the uploaded documents",
            )

    def _finalize_response(self, structured: LLMQueryResponse) -> QueryResponse:
        citations = [
            Citation(
                filename=self._sanitize_filename(citation.filename),
                page=max(0, int(citation.page)),
                chunk_excerpt=citation.chunk_excerpt.strip()[:240],
            )
            for citation in structured.citations
            if citation.filename.strip() and citation.chunk_excerpt.strip()
        ]

        answer = structured.answer.strip()
        confidence = round(max(0.0, min(1.0, float(structured.confidence))), 3)
        if not answer:
            answer = "I don't have enough information in the uploaded documents"
            confidence = 0.0
            citations = []
        if answer == "I don't have enough information in the uploaded documents":
            citations = []

        return QueryResponse(
            answer=answer,
            citations=citations,
            confidence=confidence,
        )

    def _fallback_response(
        self,
        chunks: list[RetrievedChunk],
        answer: str,
        confidence: float,
    ) -> QueryResponse:
        return QueryResponse(
            answer=answer,
            citations=[
                Citation(
                    filename=chunk.filename,
                    page=chunk.page,
                    chunk_excerpt=chunk.text[:240],
                )
                for chunk in chunks[:2]
            ],
            confidence=confidence,
        )

    def _sanitize_filename(self, filename: str) -> str:
        return Path(filename).name

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
