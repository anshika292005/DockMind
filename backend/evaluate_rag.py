import json
import math
from datetime import datetime, timezone
from pathlib import Path

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from ragas import evaluate
from ragas.dataset_schema import EvaluationDataset
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import answer_relevancy, context_recall, faithfulness

from app.core.config import settings
from app.services.rag import RagService


def run_evaluation() -> dict[str, object]:
    testset_path = Path(settings.eval_testset_path)
    output_path = Path(settings.eval_results_path)
    testset = json.loads(testset_path.read_text())
    rag_service = RagService()

    samples = []
    per_question_results = []

    for item in testset["questions"]:
        question = item["question"]
        reference_answer = item["reference_answer"]
        chunks = rag_service._retrieve_chunks(question=question, top_k=5)
        response = rag_service.answer_question(question=question, top_k=5)

        samples.append(
            {
                "user_input": question,
                "retrieved_contexts": [chunk.text for chunk in chunks],
                "response": response.answer,
                "reference": reference_answer,
            }
        )

        per_question_results.append(
            {
                "question": question,
                "reference_answer": reference_answer,
                "generated_answer": response.answer,
            }
        )

    dataset = EvaluationDataset.from_list(samples)

    groq_llm = ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=0,
    )
    ragas_llm = LangchainLLMWrapper(groq_llm)

    hf_embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model_name)
    ragas_embeddings = LangchainEmbeddingsWrapper(hf_embeddings)

    result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy, context_recall],
        llm=ragas_llm,
        embeddings=ragas_embeddings,
        raise_exceptions=False,
        show_progress=True,
    )

    for row, scores in zip(per_question_results, result.scores):
        row["faithfulness"] = normalize_score(scores.get("faithfulness"))
        row["answer_relevancy"] = normalize_score(scores.get("answer_relevancy"))
        row["context_recall"] = normalize_score(scores.get("context_recall"))

    payload = {
        "status": "completed",
        "last_evaluated_at": datetime.now(timezone.utc).isoformat(),
        "sample_document": testset.get("sample_document"),
        "metrics": {
            "faithfulness": average_metric(per_question_results, "faithfulness"),
            "answer_relevancy": average_metric(per_question_results, "answer_relevancy"),
            "context_recall": average_metric(per_question_results, "context_recall"),
        },
        "per_question": per_question_results,
    }

    output_path.write_text(json.dumps(payload, indent=2))
    return payload


def normalize_score(value: object) -> float | None:
    if value is None:
        return None
    numeric = float(value)
    if math.isnan(numeric):
        return None
    return round(numeric, 4)


def average_metric(rows: list[dict[str, object]], key: str) -> float:
    values = [float(value) for row in rows if (value := row.get(key)) is not None]
    if not values:
        return 0.0
    return round(sum(values) / len(values), 4)


if __name__ == "__main__":
    run_evaluation()
