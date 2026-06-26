from pydantic import BaseModel, Field


class TelemetrySummaryResponse(BaseModel):
    total_events: int = Field(ge=0)
    event_counts: dict[str, int]
    http: dict[str, float | int]
    queries: dict[str, float | int]
    uploads: dict[str, float | int]
    streams: dict[str, float | int]

