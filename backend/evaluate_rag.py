import json
import math
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langchain_core.embeddings import Embeddings
from langchain_groq import ChatGroq
from ragas import evaluate
from ragas.dataset_schema import EvaluationDataset
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import answer_relevancy, context_recall, faithfulness
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.services.rag import RagService


@dataclass(frozen=True)
class EvaluationThresholds:
    faithfulness: float = 0.75
    answer_relevancy: float = 0.70
    context_recall: float = 0.70

    def as_dict(self) -> dict[str, float]:
        return {
            "faithfulness": self.faithfulness,
            "answer_relevancy": self.answer_relevancy,
            "context_recall": self.context_recall,
        }


class SentenceTransformerEmbeddings(Embeddings):
    def __init__(self, model_name: str) -> None:
        self._model = SentenceTransformer(model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        embeddings = self._model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return [embedding.tolist() for embedding in embeddings]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


def run_evaluation() -> dict[str, object]:
    testset = _load_testset(Path(settings.eval_testset_path))
    output_path = Path(settings.eval_results_path)
    rag_service = RagService()
    thresholds = EvaluationThresholds(
        faithfulness=float(os.getenv("EVAL_FAITHFULNESS_THRESHOLD", "0.75")),
        answer_relevancy=float(os.getenv("EVAL_ANSWER_RELEVANCY_THRESHOLD", "0.70")),
        context_recall=float(os.getenv("EVAL_CONTEXT_RECALL_THRESHOLD", "0.70")),
    )

    samples: list[dict[str, Any]] = []
    per_question_results: list[dict[str, Any]] = []

    for item in testset["questions"]:
        question = str(item["question"])
        reference_answer = str(item["reference_answer"])
        retrieved_chunks = rag_service._retrieve_chunks(question=question, top_k=5)
        response = rag_service.answer_question(question=question, top_k=5)

        samples.append(
            {
                "user_input": question,
                "retrieved_contexts": [chunk.text for chunk in retrieved_chunks],
                "response": response.answer,
                "reference": reference_answer,
            }
        )

        per_question_results.append(
            {
                "question": question,
                "reference_answer": reference_answer,
                "generated_answer": response.answer,
                "retrieved_chunks": [
                    {
                        "filename": chunk.filename,
                        "page": chunk.page,
                        "chunk_excerpt": chunk.text[:240],
                    }
                    for chunk in retrieved_chunks
                ],
            }
        )

    dataset = EvaluationDataset.from_list(samples)

    groq_llm = ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=0,
    )
    ragas_llm = LangchainLLMWrapper(groq_llm)

    hf_embeddings = SentenceTransformerEmbeddings(settings.embedding_model_name)
    ragas_embeddings = LangchainEmbeddingsWrapper(hf_embeddings)

    result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy, context_recall],
        llm=ragas_llm,
        embeddings=ragas_embeddings,
        raise_exceptions=False,
        show_progress=True,
    )

    score_rows = _extract_score_rows(result)
    for row, scores in zip(per_question_results, score_rows):
        row["faithfulness"] = _normalize_score(scores.get("faithfulness"))
        row["answer_relevancy"] = _normalize_score(scores.get("answer_relevancy"))
        row["context_recall"] = _normalize_score(scores.get("context_recall"))
        row["passed"] = _row_passes_thresholds(row, thresholds)

    metrics = {
        "faithfulness": _average_metric(per_question_results, "faithfulness"),
        "answer_relevancy": _average_metric(per_question_results, "answer_relevancy"),
        "context_recall": _average_metric(per_question_results, "context_recall"),
    }

    payload = {
        "status": "completed",
        "last_evaluated_at": datetime.now(timezone.utc).isoformat(),
        "sample_document": testset.get("sample_document"),
        "question_count": len(testset["questions"]),
        "metrics": metrics,
        "thresholds": thresholds.as_dict(),
        "regression_passed": _regression_passed(metrics, thresholds),
        "per_question": per_question_results,
    }

    output_path.write_text(json.dumps(payload, indent=2))
    return payload


def _load_testset(path: Path) -> dict[str, object]:
    payload = json.loads(path.read_text())
    questions = payload.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("eval testset must contain a non-empty 'questions' array")

    for index, item in enumerate(questions, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"question {index} must be an object")
        if not str(item.get("question", "")).strip():
            raise ValueError(f"question {index} is missing 'question'")
        if not str(item.get("reference_answer", "")).strip():
            raise ValueError(f"question {index} is missing 'reference_answer'")

    return payload


def _extract_score_rows(result: Any) -> list[dict[str, Any]]:
    if hasattr(result, "to_pandas"):
        frame = result.to_pandas()
        return frame.to_dict(orient="records")
    if hasattr(result, "scores"):
        return list(result.scores)
    raise TypeError("Unexpected RAGAS result object: missing score table")


def _normalize_score(value: object) -> float | None:
    if value is None:
        return None
    numeric = float(value)
    if math.isnan(numeric):
        return None
    return round(numeric, 4)


def _average_metric(rows: list[dict[str, object]], key: str) -> float:
    values = [float(value) for row in rows if (value := row.get(key)) is not None]
    if not values:
        return 0.0
    return round(sum(values) / len(values), 4)


def _row_passes_thresholds(row: dict[str, Any], thresholds: EvaluationThresholds) -> bool:
    for key, minimum in thresholds.as_dict().items():
        value = row.get(key)
        if value is None or float(value) < minimum:
            return False
    return True


def _regression_passed(metrics: dict[str, float], thresholds: EvaluationThresholds) -> bool:
    for key, minimum in thresholds.as_dict().items():
        if metrics.get(key, 0.0) < minimum:
            return False
    return True


if __name__ == "__main__":
    run_evaluation()
