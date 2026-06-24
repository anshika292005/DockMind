from fastapi import APIRouter, HTTPException, status, Header

from app.models.research import ResearchRequest, ResearchResponse
from app.services.rag import GroqRateLimitError
from app.services.research_agent import (
    DeepResearchAgent,
    ResearchAgentConfigurationError,
)


router = APIRouter(tags=["research"])
research_agent: DeepResearchAgent | None = None


def get_research_agent() -> DeepResearchAgent:
    global research_agent

    if research_agent is None:
        research_agent = DeepResearchAgent()

    return research_agent


@router.post("/research", response_model=ResearchResponse, response_model_exclude_none=True)
async def research(
    payload: ResearchRequest,
    x_groq_api_key: str | None = Header(default=None),
    x_groq_model: str | None = Header(default=None),
) -> ResearchResponse:
    try:
        return get_research_agent().run(
            payload.question,
            api_key=x_groq_api_key,
            model=x_groq_model,
        )
    except ResearchAgentConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except GroqRateLimitError as exc:
        headers = {"Retry-After": exc.retry_after} if exc.retry_after else None
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "groq_rate_limit_exceeded",
                "message": "Groq rate limit exceeded. Please retry after the reset window.",
                "retry_after": exc.retry_after,
            },
            headers=headers,
        ) from exc
