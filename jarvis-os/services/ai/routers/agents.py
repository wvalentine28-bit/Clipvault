from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import json

router = APIRouter()


class AgentRunRequest(BaseModel):
    agent_type: str
    goal: str
    user_id: str
    user_context: str = ""
    model: str = "claude-sonnet-4-6"
    stream: bool = False


async def run_agent(
    agent_type: str,
    goal: str,
    user_context: str,
    model: str,
) -> str:
    if agent_type == "research":
        from agents.research_agent import run_research_agent
        return await run_research_agent(goal, user_context, model)

    # Fallback for other agent types
    from agents.research_agent import get_llm
    from langchain_core.messages import HumanMessage, SystemMessage

    AGENT_PROMPTS = {
        "coding": "You are JARVIS's Coding Agent. Generate, analyze, and explain code with precision.",
        "planning": "You are JARVIS's Planning Agent. Create detailed, actionable plans.",
        "automation": "You are JARVIS's Automation Agent. Plan computer and browser automation tasks.",
        "memory": "You are JARVIS's Memory Agent. Organize and retrieve information efficiently.",
        "communication": "You are JARVIS's Communication Agent. Draft professional communications.",
    }

    system = AGENT_PROMPTS.get(
        agent_type,
        "You are JARVIS, an advanced AI assistant. Complete the given goal."
    )

    llm = get_llm(model)
    messages = [
        SystemMessage(content=f"{system}\n\n{user_context}"),
        HumanMessage(content=goal),
    ]
    response = await llm.ainvoke(messages)
    return response.content


async def stream_agent(
    agent_type: str,
    goal: str,
    user_context: str,
    model: str,
) -> AsyncGenerator[str, None]:
    if agent_type == "research":
        from agents.research_agent import stream_research_agent
        async for chunk in stream_research_agent(goal, user_context, model):
            yield f"data: {json.dumps({'type': 'delta', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    from agents.research_agent import get_llm
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = get_llm(model)
    messages = [
        SystemMessage(content=f"You are JARVIS's {agent_type} agent.\n\n{user_context}"),
        HumanMessage(content=goal),
    ]

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield f"data: {json.dumps({'type': 'delta', 'content': chunk.content})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/run")
async def run_agent_endpoint(request: AgentRunRequest):
    if request.stream:
        return StreamingResponse(
            stream_agent(
                request.agent_type,
                request.goal,
                request.user_context,
                request.model,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    result = await run_agent(
        request.agent_type,
        request.goal,
        request.user_context,
        request.model,
    )
    return {"success": True, "data": {"result": result}}


@router.get("/types")
async def list_agent_types():
    return {
        "success": True,
        "data": [
            {
                "type": "research",
                "name": "Research Agent",
                "description": "Web search and information gathering",
            },
            {
                "type": "coding",
                "name": "Coding Agent",
                "description": "Code generation, analysis, debugging",
            },
            {
                "type": "planning",
                "name": "Planning Agent",
                "description": "Task planning and goal tracking",
            },
            {
                "type": "automation",
                "name": "Automation Agent",
                "description": "Computer and browser automation",
            },
            {
                "type": "memory",
                "name": "Memory Agent",
                "description": "Long-term memory management",
            },
            {
                "type": "communication",
                "name": "Communication Agent",
                "description": "Email and calendar management",
            },
        ],
    }
