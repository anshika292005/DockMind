import json
from typing import Any

from langchain_core.prompts import PromptTemplate
from langchain_core.tools import tool

from app.core.config import settings
from app.models.research import ResearchResponse, ResearchSource
from app.services.rag import GroqRateLimitError, RagConfigurationError, RagService


class ResearchAgentConfigurationError(Exception):
    pass


class DeepResearchAgent:
    def __init__(self) -> None:
        self._rag_service = RagService()

    def run(self, question: str, api_key: str | None = None, model: str | None = None) -> ResearchResponse:
        resolved_key = api_key or settings.groq_api_key
        if not resolved_key:
            raise ResearchAgentConfigurationError("GROQ_API_KEY is not configured")

        sources: list[ResearchSource] = []
        agent_steps: list[str] = []
        last_rag_confidence: float | None = None

        @tool
        def rag_search(query: str) -> str:
            """Search uploaded DocMind PDFs first. Use this for any question that may be answered by the user's uploaded documents. Returns JSON with answer, confidence, and document citations."""
            nonlocal last_rag_confidence

            agent_steps.append("Searched uploaded documents with RAG.")
            result = self._rag_service.answer_question(question=query, top_k=5, api_key=api_key, model=model)
            last_rag_confidence = result.confidence

            for citation in result.citations:
                source = ResearchSource(
                    type="document",
                    filename=citation.filename,
                    page=citation.page,
                )
                if source not in sources:
                    sources.append(source)

            if result.confidence < 0.6:
                agent_steps.append("Found low document confidence; web search is allowed.")

            return result.model_dump_json()

        @tool
        def web_search(query: str) -> str:
            """Search the live web with Tavily. Use this only when rag_search returns confidence below 0.6, when the question asks for recent information, or when the answer requires external facts not present in uploaded documents."""
            if not settings.tavily_api_key:
                raise ResearchAgentConfigurationError("TAVILY_API_KEY is not configured")
            if last_rag_confidence is None:
                return "web_search skipped: call rag_search first."
            if last_rag_confidence >= 0.6 and not self._looks_external(question):
                return "web_search skipped: document confidence is sufficient and the question does not require recent or external information."

            from tavily import TavilyClient

            agent_steps.append("Searched the web with Tavily.")
            client = TavilyClient(api_key=settings.tavily_api_key)
            response = client.search(query=query, max_results=3)
            results = []

            for item in response.get("results", [])[:3]:
                result = {
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", ""),
                }
                results.append(result)

                source = ResearchSource(
                    type="web",
                    url=result["url"],
                    title=result["title"],
                )
                if source not in sources:
                    sources.append(source)

            return json.dumps(results)

        executor = self._build_executor(tools=[rag_search, web_search], api_key=api_key, model=model)

        try:
            result = executor.invoke({"input": question})
        except GroqRateLimitError:
            raise
        except RagConfigurationError as exc:
            raise ResearchAgentConfigurationError(str(exc)) from exc
        except Exception as exc:
            if self._is_rate_limit_error(exc):
                raise GroqRateLimitError(retry_after=self._retry_after(exc)) from exc
            raise

        for step in result.get("intermediate_steps", []):
            tool_name = getattr(step[0], "tool", "tool")
            agent_steps.append(f"Agent used {tool_name}.")

        return ResearchResponse(
            report=str(result.get("output", "")).strip(),
            sources=sources,
            agent_steps=self._dedupe_steps(agent_steps),
        )

    def _looks_external(self, question: str) -> bool:
        external_markers = (
            "current",
            "recent",
            "latest",
            "today",
            "now",
            "this week",
            "this month",
            "this year",
            "news",
            "web",
            "internet",
            "external",
        )
        normalized_question = question.lower()
        return any(marker in normalized_question for marker in external_markers)

    def _build_executor(self, tools: list[Any], api_key: str | None = None, model: str | None = None) -> Any:
        from langchain_classic.agents import AgentExecutor, create_react_agent
        from langchain_groq import ChatGroq

        resolved_key = api_key or settings.groq_api_key
        resolved_model = model or settings.groq_model

        llm = ChatGroq(
            model=resolved_model,
            api_key=resolved_key,
            temperature=0,
        )

        prompt = PromptTemplate.from_template(
            """
You are DocMind DeepResearch, a ReAct research agent.

You have access to these tools:
{tools}

Tool names: {tool_names}

Behavior rules:
- Always call rag_search first.
- Inspect the rag_search JSON confidence field.
- If confidence is below 0.6, or the question asks about recent/current/external information, call web_search.
- Synthesize a concise final research report from the document and web evidence.
- Do not invent sources.
- In the final answer, write only the report text. The API will attach structured sources separately.

Use this ReAct format:

Question: the input question
Thought: reason about what to do next
Action: one of [{tool_names}]
Action Input: the tool input
Observation: the tool result
... repeat Thought/Action/Action Input/Observation as needed
Thought: I now know the final answer
Final Answer: the final research report

Question: {input}
Thought: {agent_scratchpad}
""".strip()
        )

        agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)
        return AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=False,
            return_intermediate_steps=True,
            handle_parsing_errors=True,
            max_iterations=4,
        )

    def _dedupe_steps(self, steps: list[str]) -> list[str]:
        deduped: list[str] = []
        for step in steps:
            if step not in deduped:
                deduped.append(step)
        return deduped

    def _is_rate_limit_error(self, exc: Exception) -> bool:
        status_code = getattr(exc, "status_code", None)
        response = getattr(exc, "response", None)
        response_status = getattr(response, "status_code", None)
        return (
            status_code == 429
            or response_status == 429
            or "rate limit" in str(exc).lower()
        )

    def _retry_after(self, exc: Exception) -> str | None:
        response = getattr(exc, "response", None)
        headers: Any = getattr(response, "headers", None)
        if headers is None:
            return None
        return headers.get("retry-after") or headers.get("Retry-After")
