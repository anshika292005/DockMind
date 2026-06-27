from time import perf_counter

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.ingestion import DuplicateUploadError, PdfIngestionService
from app.services.telemetry import telemetry_service


router = APIRouter(tags=["documents"])
ingestion_service: PdfIngestionService | None = None


def get_ingestion_service() -> PdfIngestionService:
    global ingestion_service

    if ingestion_service is None:
        ingestion_service = PdfIngestionService()

    return ingestion_service


@router.post("/upload")
async def upload_pdfs(files: list[UploadFile] = File(...)) -> dict[str, object]:
    if len(files) != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload one PDF at a time.",
        )

    results: list[dict[str, object]] = []
    service = get_ingestion_service()

    for file in files:
        started_at = perf_counter()
        try:
            result = await service.ingest_pdf(file)
            results.append(result)
            telemetry_service.record_upload(
                filename=str(result.get("filename") or file.filename or "uploaded.pdf"),
                chunks_stored=int(result.get("chunks_stored") or 0),
                text_pages=int(result.get("text_pages") or 0),
                ocr_pages=int(result.get("ocr_pages") or 0),
                duration_ms=(perf_counter() - started_at) * 1000,
            )
        except DuplicateUploadError as exc:
            result = {
                "status": "duplicate",
                "chunks_stored": 0,
                "filename": exc.filename,
                "message": "File was already ingested by filename hash.",
            }
            results.append(result)
            telemetry_service.record_upload(
                filename=exc.filename,
                chunks_stored=0,
                text_pages=0,
                ocr_pages=0,
                duration_ms=(perf_counter() - started_at) * 1000,
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
