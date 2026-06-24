from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.eval import router as eval_router
from app.api.rag import router as rag_router
from app.api.research import router as research_router
from app.api.upload import router as upload_router
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    description="FastAPI backend for document Q&A with LlamaIndex, ChromaDB, and Groq.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.memory import router as memory_router

app.include_router(upload_router)
app.include_router(rag_router)
app.include_router(research_router)
app.include_router(eval_router)
app.include_router(memory_router)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
