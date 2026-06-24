from fastapi import APIRouter, BackgroundTasks

from app.models.eval import EvalResultsResponse, EvalRunResponse
from app.services.evaluation import EvaluationService


router = APIRouter(tags=["evaluation"])
evaluation_service = EvaluationService()


@router.get("/eval/results", response_model=EvalResultsResponse)
async def get_eval_results() -> EvalResultsResponse:
    return EvalResultsResponse(**evaluation_service.read_results())


@router.post("/eval/run", response_model=EvalRunResponse)
async def run_eval(background_tasks: BackgroundTasks) -> EvalRunResponse:
    background_tasks.add_task(evaluation_service.run_evaluation_job)
    return EvalRunResponse(
        status="accepted",
        message="Evaluation started in the background.",
    )
