from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.ingestion import DuplicateUploadError, PdfIngestionService


router = APIRouter(tags=["documents"])
ingestion_service: PdfIngestionService | None = None


def get_ingestion_service() -> PdfIngestionService:
    global ingestion_service

    if ingestion_service is None:
        ingestion_service = PdfIngestionService()

    return ingestion_service


@router.post("/upload")
async def upload_pdfs(files: list[UploadFile] = File(...)) -> dict[str, object]:
    results: list[dict[str, object]] = []
    service = get_ingestion_service()

    for file in files:
        try:
            results.append(await service.ingest_pdf(file))
        except DuplicateUploadError as exc:
            results.append(
                {
                    "status": "duplicate",
                    "chunks_stored": 0,
                    "filename": exc.filename,
                    "message": "File was already ingested by filename hash.",
                }
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    if len(results) == 1:
        return results[0]

    return {
        "status": "success",
        "files": results,
        "chunks_stored": sum(int(result["chunks_stored"]) for result in results),
    }
