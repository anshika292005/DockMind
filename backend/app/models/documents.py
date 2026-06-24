from pydantic import BaseModel, Field


class DocumentSummary(BaseModel):
    filename: str
    chunks_stored: int = Field(ge=0)
    upload_timestamp: str | None = None


class DocumentsListResponse(BaseModel):
    documents: list[DocumentSummary]


class DeleteDocumentResponse(BaseModel):
    status: str
    filename: str
    chunks_deleted: int
