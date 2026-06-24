from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)
    session_id: str | None = None
    filename: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class Citation(BaseModel):
    filename: str
    page: int
    chunk_excerpt: str


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    confidence: float = Field(ge=0.0, le=1.0)
