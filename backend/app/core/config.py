import os

from dotenv import load_dotenv


load_dotenv()


class Settings:
    app_name: str = "DocMind AI API"
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    chroma_host: str = os.getenv("CHROMA_HOST", "localhost")
    chroma_port: int = int(os.getenv("CHROMA_PORT", "8001"))
    chroma_collection: str = os.getenv("CHROMA_COLLECTION", "docmind_docs")
    chroma_uploads_collection: str = os.getenv(
        "CHROMA_UPLOADS_COLLECTION",
        "docmind_uploads",
    )
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    tavily_api_key: str | None = os.getenv("TAVILY_API_KEY")
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size: int = 512
    chunk_overlap: int = 100
    stream_artificial_delay_ms: int = int(os.getenv("STREAM_ARTIFICIAL_DELAY_MS", "0"))
    eval_results_path: str = os.getenv("EVAL_RESULTS_PATH", "./eval_results.json")
    eval_status_path: str = os.getenv("EVAL_STATUS_PATH", "./eval_status.json")
    eval_testset_path: str = os.getenv("EVAL_TESTSET_PATH", "./eval_testset.json")


settings = Settings()
