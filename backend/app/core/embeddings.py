from pathlib import Path
import hashlib
import math
import re

from app.core.config import settings


class LightweightEmbeddingModel:
    def __init__(self, dimension: int = 384) -> None:
        self._dimension = dimension

    def get_sentence_embedding_dimension(self) -> int:
        return self._dimension

    def encode(
        self,
        texts,
        normalize_embeddings: bool = True,
        show_progress_bar: bool = False,
    ):
        del show_progress_bar
        return [
            self._embed_text(str(text), normalize_embeddings=normalize_embeddings)
            for text in texts
        ]

    def _embed_text(self, text: str, normalize_embeddings: bool) -> list[float]:
        vector = [0.0] * self._dimension
        tokens = re.findall(r"[a-z0-9]+", text.lower())

        for token in tokens:
            digest = hashlib.md5(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self._dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        if normalize_embeddings:
            norm = math.sqrt(sum(value * value for value in vector))
            if norm > 0:
                vector = [value / norm for value in vector]

        return vector


def create_embedding_model():
    if not settings.use_hf_embeddings:
        return LightweightEmbeddingModel(settings.embedding_dimension)

    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer(resolve_embedding_model_path())
    except Exception:
        return LightweightEmbeddingModel(settings.embedding_dimension)


def resolve_embedding_model_path() -> str:
    cache_root = (
        Path.home()
        / ".cache"
        / "huggingface"
        / "hub"
        / "models--sentence-transformers--all-MiniLM-L6-v2"
        / "snapshots"
    )
    if not cache_root.exists():
        return settings.embedding_model_name

    candidates = sorted(
        [path for path in cache_root.iterdir() if path.is_dir()],
        key=lambda path: path.name,
    )
    for candidate in reversed(candidates):
        if (candidate / "config.json").exists() and (candidate / "modules.json").exists():
            return str(candidate)

    return settings.embedding_model_name
