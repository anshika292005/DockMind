from fastapi import APIRouter, Query

from app.services.telemetry import telemetry_service


router = APIRouter(tags=["telemetry"])


@router.get("/telemetry/summary")
async def telemetry_summary() -> dict[str, object]:
    return telemetry_service.summary()


@router.get("/telemetry/events")
async def telemetry_events(limit: int = Query(default=50, ge=1, le=500)) -> dict[str, object]:
    return {
        "events": telemetry_service.recent_events(limit=limit),
        "limit": limit,
    }
