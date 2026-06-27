from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.services.ingestion import DuplicateUploadError, PdfIngestionService
from app.services.telemetry import telemetry_service


router = APIRouter(tags=["documents"])
ingestion_service: PdfIngestionService | None = None
upload_jobs: dict[str, dict[str, object]] = {}


def get_ingestion_service() -> PdfIngestionService:
    global ingestion_service

    if ingestion_service is None:
        ingestion_service = PdfIngestionService()

    return ingestion_service


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def process_upload_job(job_id: str, filename: str, file_bytes: bytes) -> None:
    started_at = perf_counter()
    upload_jobs[job_id].update(
        {
            "status": "processing",
            "progress": 95,
            "message": "Processing document",
            "updated_at": utc_now(),
        }
    )

    try:
        result = get_ingestion_service().ingest_pdf_bytes(
            filename=filename,
            file_bytes=file_bytes,
        )
        upload_jobs[job_id].update(
            {
                "status": "success",
                "progress": 100,
                "message": "Upload complete",
                "result": result,
                "updated_at": utc_now(),
            }
        )
        telemetry_service.record_upload(
            filename=str(result.get("filename") or filename),
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
        upload_jobs[job_id].update(
            {
                "status": "duplicate",
                "progress": 100,
                "message": result["message"],
                "result": result,
                "updated_at": utc_now(),
            }
        )
        telemetry_service.record_upload(
            filename=exc.filename,
            chunks_stored=0,
            text_pages=0,
            ocr_pages=0,
            duration_ms=(perf_counter() - started_at) * 1000,
        )
    except Exception as exc:
        upload_jobs[job_id].update(
            {
                "status": "error",
                "progress": 100,
                "message": str(exc),
                "updated_at": utc_now(),
            }
        )


@router.post("/upload")
async def upload_pdfs(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
) -> dict[str, object]:
    if len(files) != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload one PDF at a time.",
        )

    file = files[0]
    filename = file.filename or "uploaded.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{filename} is not a PDF file",
        )

    job_id = str(uuid4())
    file_bytes = await file.read()
    upload_jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 90,
        "filename": filename,
        "message": "Upload received",
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    background_tasks.add_task(process_upload_job, job_id, filename, file_bytes)

    return upload_jobs[job_id]


@router.get("/upload/jobs/{job_id}")
async def get_upload_job(job_id: str) -> dict[str, object]:
    job = upload_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload job not found",
        )
    return job
