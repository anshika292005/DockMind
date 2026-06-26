from pathlib import Path

from app.core.config import settings


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
