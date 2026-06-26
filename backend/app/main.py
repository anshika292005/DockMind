from time import perf_counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.eval import router as eval_router
from app.api.rag import router as rag_router
from app.api.research import router as research_router
from app.api.telemetry import router as telemetry_router
from app.api.upload import router as upload_router
from app.core.config import settings
from app.services.telemetry import telemetry_service

app = FastAPI(
    title=settings.app_name,
    description="FastAPI backend for document Q&A with LlamaIndex, ChromaDB, and Groq.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(set([settings.frontend_origin, *settings.frontend_origins])),
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
app.include_router(telemetry_router)


@app.middleware("http")
async def record_http_request(request, call_next):
    started_at = perf_counter()
    response = await call_next(request)
    duration_ms = (perf_counter() - started_at) * 1000

    if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
        telemetry_service.record_http_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

    return response


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
