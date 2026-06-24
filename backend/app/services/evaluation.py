import json
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings


class EvaluationService:
    def __init__(self) -> None:
        self._results_path = Path(settings.eval_results_path)
        self._status_path = Path(settings.eval_status_path)

    def read_results(self) -> dict[str, object]:
        if not self._results_path.exists():
            return {
                "status": self._read_status().get("status", "not_run"),
                "last_evaluated_at": None,
                "sample_document": None,
                "metrics": None,
                "per_question": [],
                "error": self._read_status().get("error"),
            }

        payload = json.loads(self._results_path.read_text())
        status = self._read_status()
        payload["status"] = status.get("status", payload.get("status", "completed"))
        if status.get("error"):
            payload["error"] = status["error"]
        return payload

    def run_evaluation_job(self) -> None:
        from evaluate_rag import run_evaluation

        self._write_status({"status": "running", "error": None, "started_at": utc_now()})

        try:
            run_evaluation()
        except Exception as exc:
            self._write_status(
                {
                    "status": "failed",
                    "error": str(exc),
                    "finished_at": utc_now(),
                }
            )
            raise

        self._write_status(
            {
                "status": "completed",
                "error": None,
                "finished_at": utc_now(),
            }
        )

    def _read_status(self) -> dict[str, object]:
        if not self._status_path.exists():
            return {"status": "not_run"}
        return json.loads(self._status_path.read_text())

    def _write_status(self, payload: dict[str, object]) -> None:
        self._status_path.write_text(json.dumps(payload, indent=2))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
