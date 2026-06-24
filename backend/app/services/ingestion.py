import hashlib
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


class DuplicateUploadError(Exception):
    def __init__(self, filename: str, filename_hash: str) -> None:
        self.filename = filename
        self.filename_hash = filename_hash
        super().__init__(f"{filename} has already been uploaded")


class PdfIngestionService:
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
        self._embedder = SentenceTransformer(settings.embedding_model_name)
        self._embedding_dimension = int(
            self._embedder.get_sentence_embedding_dimension()
        )

    async def ingest_pdf(self, file: UploadFile) -> dict[str, object]:
        filename = Path(file.filename or "uploaded.pdf").name
        if not filename.lower().endswith(".pdf"):
            raise ValueError(f"{filename} is not a PDF file")

        filename_hash = self.hash_filename(filename)
        if self._upload_exists(filename_hash):
            raise DuplicateUploadError(filename=filename, filename_hash=filename_hash)

        upload_timestamp = datetime.now(timezone.utc).isoformat()

        with tempfile.TemporaryDirectory() as temp_dir:
            from pypdf import PdfReader

            temp_path = Path(temp_dir) / filename
            temp_path.write_bytes(await file.read())

            reader = PdfReader(str(temp_path))
            chunks: list[dict[str, object]] = []
            chunk_index = 0

            # Loading: read each PDF page into plain text.
            for page_number, page in enumerate(reader.pages, start=1):
                page_text = (page.extract_text() or "").strip()
                if not page_text:
                    continue

                # Chunking: split page text into overlapping word windows.
                for chunk_text in self._chunk_text(page_text):
                    chunks.append(
                        {
                            "id": f"{filename_hash}:{page_number}:{chunk_index}",
                            "text": chunk_text,
                            "page_number": page_number,
                            "chunk_index": chunk_index,
                        }
                    )
                    chunk_index += 1

            if chunks:
                # Embedding + storing: encode locally, then persist in ChromaDB.
                embeddings = self._embedder.encode(
                    [str(chunk["text"]) for chunk in chunks],
                    normalize_embeddings=True,
                    show_progress_bar=False,
                )

                self._docs_collection.add(
                    ids=[str(chunk["id"]) for chunk in chunks],
                    documents=[str(chunk["text"]) for chunk in chunks],
                    embeddings=[embedding.tolist() for embedding in embeddings],
                    metadatas=[
                        {
                            "filename": filename,
                            "filename_hash": filename_hash,
                            "page_number": int(chunk["page_number"]),
                            "chunk_index": int(chunk["chunk_index"]),
                            "upload_timestamp": upload_timestamp,
                        }
                        for chunk in chunks
                    ],
                )

            self._mark_upload_complete(
                filename=filename,
                filename_hash=filename_hash,
                chunks_stored=len(chunks),
                upload_timestamp=upload_timestamp,
            )

        return {
            "status": "success",
            "chunks_stored": len(chunks),
            "filename": filename,
        }

    def _upload_exists(self, filename_hash: str) -> bool:
        existing = self._uploads_collection.get(ids=[filename_hash])
        return bool(existing.get("ids"))

    def _mark_upload_complete(
        self,
        filename: str,
        filename_hash: str,
        chunks_stored: int,
        upload_timestamp: str,
    ) -> None:
        self._uploads_collection.add(
            ids=[filename_hash],
            documents=[filename],
            embeddings=[[0.0] * self._embedding_dimension],
            metadatas=[
                {
                    "filename": filename,
                    "chunks_stored": chunks_stored,
                    "upload_timestamp": upload_timestamp,
                }
            ],
        )

    @staticmethod
    def hash_filename(filename: str) -> str:
        normalized_filename = filename.strip().lower().encode("utf-8")
        return hashlib.sha256(normalized_filename).hexdigest()

    def _chunk_text(self, text: str) -> list[str]:
        words = re.findall(r"\S+", text)
        if not words:
            return []

        chunks: list[str] = []
        start = 0
        chunk_size = max(50, int(settings.chunk_size))
        overlap = max(0, min(int(settings.chunk_overlap), chunk_size - 1))

        while start < len(words):
            end = min(len(words), start + chunk_size)
            chunk = " ".join(words[start:end]).strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(words):
                break
            start = max(end - overlap, start + 1)

        return chunks
