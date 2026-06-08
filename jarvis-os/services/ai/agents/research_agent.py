import asyncio
from typing import AsyncGenerator, Optional
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_community.utilities import SerpAPIWrapper
from langchain.tools import Tool
import structlog

from config import settings

logger = structlog.get_logger()

RESEARCH_SYSTEM_PROMPT = """You are JARVIS's Research Agent. Your mission is to gather accurate,
comprehensive information from the internet.

Capabilities:
- Search the web for current information
- Scrape and extract relevant content
- Cross-reference multiple sources
- Synthesize findings into clear, structured reports
- Cite sources

Always:
1. Search multiple sources before answering
2. Verify facts across sources when possible
3. Present information in a structured format
4. Include source URLs
5. Note any conflicting information

Be precise, thorough, and cite your sources."""


def get_search_tools():
    tools = []

    if settings.tavily_api_key:
        tavily = TavilySearchResults(
            api_key=settings.tavily_api_key,
            max_results=5,
            search_depth="advanced",
            include_answer=True,
        )
        tools.append(tavily)

    elif settings.serpapi_api_key:
        search = SerpAPIWrapper(serpapi_api_key=settings.serpapi_api_key)
        tools.append(
            Tool(
                name="web_search",
                description="Search the web for current information",
                func=search.run,
            )
        )

    return tools


def get_llm(model: str = "claude-sonnet-4-6"):
    if model.startswith("claude") and settings.anthropic_api_key:
        return ChatAnthropic(
            api_key=settings.anthropic_api_key,
            model=model,
            temperature=0.3,
        )

    if settings.openai_api_key:
        return ChatOpenAI(
            api_key=settings.openai_api_key,
            model="gpt-4o",
            temperature=0.3,
        )

    raise ValueError("No AI provider configured")


async def run_research_agent(
    query: str,
    user_context: str = "",
    model: str = "claude-sonnet-4-6",
    stream: bool = False,
) -> str:
    tools = get_search_tools()

    if not tools:
        return f"[Research Agent] No search tools configured. Cannot research: {query}"

    llm = get_llm(model)

    try:
        agent = create_tool_calling_agent(
            llm=llm,
            tools=tools,
            prompt=None,  # Will use default
        )

        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            max_iterations=5,
            return_intermediate_steps=True,
        )

        result = await executor.ainvoke({
            "input": query,
            "chat_history": [],
        })

        return result.get("output", "Research completed but no output generated.")
    except Exception as e:
        logger.error("Research agent failed", error=str(e), query=query)

        # Fallback: direct LLM answer
        messages = [
            SystemMessage(content=RESEARCH_SYSTEM_PROMPT),
            HumanMessage(content=f"Research this topic: {query}\n\n{user_context}"),
        ]
        response = await llm.ainvoke(messages)
        return response.content


async def stream_research_agent(
    query: str,
    user_context: str = "",
    model: str = "claude-sonnet-4-6",
) -> AsyncGenerator[str, None]:
    llm = get_llm(model)

    messages = [
        SystemMessage(content=RESEARCH_SYSTEM_PROMPT),
        HumanMessage(content=f"Research and answer: {query}\n\nContext: {user_context}"),
    ]

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
