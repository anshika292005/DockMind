from typing import Literal

from pydantic import BaseModel, Field


class ResearchRequest(BaseModel):
    question: str = Field(min_length=1)
    session_id: str | None = None
    filename: str | None = None


class ResearchSource(BaseModel):
    type: Literal["document", "web"]
    filename: str | None = None
    page: int | None = None
    url: str | None = None
    title: str | None = None


class ResearchResponse(BaseModel):
    report: str
    sources: list[ResearchSource]
    agent_steps: list[str]
