import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from app.core.config import settings


class TelemetryService:
    def __init__(self) -> None:
        self._path = Path(settings.telemetry_events_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()

    def record_event(self, event_type: str, payload: dict[str, Any] | None = None) -> None:
        event = {
            "timestamp": utc_now(),
            "type": event_type,
            **(payload or {}),
        }
        line = json.dumps(event, separators=(",", ":"))
        with self._lock:
            with self._path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")

    def record_http_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
    ) -> None:
        self.record_event(
            "http_request",
            {
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )

    def record_upload(
        self,
        filename: str,
        chunks_stored: int,
        text_pages: int,
        ocr_pages: int,
        duration_ms: float,
    ) -> None:
        self.record_event(
            "upload",
            {
                "filename": filename,
                "chunks_stored": chunks_stored,
                "text_pages": text_pages,
                "ocr_pages": ocr_pages,
                "duration_ms": round(duration_ms, 2),
            },
        )

    def record_query(
        self,
        question: str,
        top_k: int,
        retrieved_chunks: int,
        confidence: float,
        answer_length: int,
        duration_ms: float,
        streamed: bool = False,
    ) -> None:
        self.record_event(
            "query",
            {
                "question": question,
                "top_k": top_k,
                "retrieved_chunks": retrieved_chunks,
                "confidence": round(confidence, 4),
                "answer_length": answer_length,
                "duration_ms": round(duration_ms, 2),
                "streamed": streamed,
            },
        )

    def record_stream(
        self,
        question: str,
        top_k: int,
        citations_count: int,
        token_count: int,
        duration_ms: float,
    ) -> None:
        self.record_event(
            "stream_query",
            {
                "question": question,
                "top_k": top_k,
                "citations_count": citations_count,
                "token_count": token_count,
                "duration_ms": round(duration_ms, 2),
            },
        )

    def summary(self) -> dict[str, Any]:
        events = self._read_events()
        counts = Counter(event.get("type", "unknown") for event in events)

        http_requests = [event for event in events if event.get("type") == "http_request"]
        queries = [event for event in events if event.get("type") == "query"]
        uploads = [event for event in events if event.get("type") == "upload"]
        streams = [event for event in events if event.get("type") == "stream_query"]

        return {
            "total_events": len(events),
            "event_counts": dict(counts),
            "http": {
                "count": len(http_requests),
                "avg_duration_ms": self._avg(http_requests, "duration_ms"),
                "p95_duration_ms": self._p95(http_requests, "duration_ms"),
                "slow_requests_over_1000ms": sum(
                    1 for event in http_requests if float(event.get("duration_ms", 0)) > 1000
                ),
            },
            "queries": {
                "count": len(queries),
                "avg_confidence": self._avg(queries, "confidence"),
                "avg_duration_ms": self._avg(queries, "duration_ms"),
                "low_confidence_count": sum(
                    1 for event in queries if float(event.get("confidence", 0)) < 0.6
                ),
            },
            "uploads": {
                "count": len(uploads),
                "avg_duration_ms": self._avg(uploads, "duration_ms"),
                "avg_chunks_stored": self._avg(uploads, "chunks_stored"),
                "ocr_pages_total": int(sum(int(event.get("ocr_pages", 0)) for event in uploads)),
            },
            "streams": {
                "count": len(streams),
                "avg_duration_ms": self._avg(streams, "duration_ms"),
                "avg_token_count": self._avg(streams, "token_count"),
            },
        }

    def recent_events(self, limit: int = 50) -> list[dict[str, Any]]:
        events = self._read_events()
        return events[-max(1, limit) :]

    def _read_events(self) -> list[dict[str, Any]]:
        if not self._path.exists():
            return []

        lines = self._path.read_text(encoding="utf-8").splitlines()
        events: list[dict[str, Any]] = []
        for line in lines[-settings.telemetry_max_events :]:
            if not line.strip():
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return events

    def _avg(self, events: list[dict[str, Any]], key: str) -> float:
        values = [float(event.get(key, 0)) for event in events if event.get(key) is not None]
        if not values:
            return 0.0
        return round(sum(values) / len(values), 2)

    def _p95(self, events: list[dict[str, Any]], key: str) -> float:
        values = sorted(float(event.get(key, 0)) for event in events if event.get(key) is not None)
        if not values:
            return 0.0
        index = int(round((len(values) - 1) * 0.95))
        return round(values[index], 2)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


telemetry_service = TelemetryService()
