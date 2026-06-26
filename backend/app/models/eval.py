from pydantic import BaseModel, Field


class EvalMetricSummary(BaseModel):
    faithfulness: float
    answer_relevancy: float
    context_recall: float


class EvalQuestionResult(BaseModel):
    question: str
    reference_answer: str
    generated_answer: str
    faithfulness: float | None = None
    answer_relevancy: float | None = None
    context_recall: float | None = None


class EvalResultsResponse(BaseModel):
    status: str
    last_evaluated_at: str | None = None
    sample_document: str | None = None
    question_count: int | None = None
    metrics: EvalMetricSummary | None = None
    thresholds: dict[str, float] | None = None
    regression_passed: bool | None = None
    per_question: list[EvalQuestionResult] = Field(default_factory=list)
    error: str | None = None


class EvalRunResponse(BaseModel):
    status: str
    message: str
