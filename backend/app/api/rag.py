import json

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models.documents import DeleteDocumentResponse, DocumentsListResponse
from app.models.query import QueryRequest, QueryResponse
from app.services.rag import GroqRateLimitError, RagConfigurationError, RagService


router = APIRouter(tags=["rag"])
rag_service: RagService | None = None


def get_rag_service() -> RagService:
    global rag_service

    if rag_service is None:
        rag_service = RagService()

    return rag_service


def sse_event(payload: dict[str, object]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@router.post("/query", response_model=QueryResponse)
async def query_documents(
    payload: QueryRequest,
) -> QueryResponse:
    try:
        return get_rag_service().answer_question(
            question=payload.question,
            top_k=payload.top_k,
        )
    except RagConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except GroqRateLimitError as exc:
        headers = {"Retry-After": exc.retry_after} if exc.retry_after else None
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "groq_rate_limit_exceeded",
                "message": "Groq rate limit exceeded. Please retry after the reset window.",
                "retry_after": exc.retry_after,
            },
            headers=headers,
        ) from exc


@router.post("/query/stream")
async def stream_query(
    payload: QueryRequest,
) -> StreamingResponse:
    try:
        citations, token_stream = get_rag_service().stream_answer(
            question=payload.question,
            top_k=payload.top_k,
        )
    except RagConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except GroqRateLimitError as exc:
        headers = {"Retry-After": exc.retry_after} if exc.retry_after else None
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "groq_rate_limit_exceeded",
                "message": "Groq rate limit exceeded. Please retry after the reset window.",
                "retry_after": exc.retry_after,
            },
            headers=headers,
        ) from exc

    def event_generator():
        yield sse_event(
            {
                "type": "citations",
                "data": [citation.model_dump() for citation in citations],
            }
        )

        try:
            for token in token_stream:
                yield sse_event({"type": "token", "content": token})
        except Exception as exc:
            if get_rag_service()._is_rate_limit_error(exc):
                payload = {
                    "type": "error",
                    "error": "groq_rate_limit_exceeded",
                    "message": "Groq rate limit exceeded. Please retry after the reset window.",
                    "retry_after": get_rag_service()._retry_after(exc),
                }
            else:
                payload = {
                    "type": "error",
                    "error": "stream_failed",
                    "message": str(exc),
                }
            yield sse_event(payload)
            return

        yield sse_event({"type": "done"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": settings.frontend_origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )


@router.get("/documents", response_model=DocumentsListResponse)
async def list_documents() -> DocumentsListResponse:
    return DocumentsListResponse(documents=get_rag_service().list_documents())


@router.delete("/documents/{filename}", response_model=DeleteDocumentResponse)
async def delete_document(filename: str) -> DeleteDocumentResponse:
    chunks_deleted = get_rag_service().delete_document(filename)

    if chunks_deleted == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No uploaded document found for {filename}",
        )

    return DeleteDocumentResponse(
        status="success",
        filename=filename,
        chunks_deleted=chunks_deleted,
    )
