from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from memory.vector_store import vector_store

router = APIRouter()


class AddMemoryRequest(BaseModel):
    memory_id: str
    content: str
    user_id: str
    memory_type: str = "general"
    importance: str = "medium"
    tags: List[str] = []


class SearchMemoryRequest(BaseModel):
    query: str
    user_id: str
    n_results: int = 10
    memory_type: Optional[str] = None


@router.post("/add")
async def add_memory(request: AddMemoryRequest):
    await vector_store.add_memory(
        memory_id=request.memory_id,
        content=request.content,
        metadata={
            "user_id": request.user_id,
            "type": request.memory_type,
            "importance": request.importance,
            "tags": ",".join(request.tags),
        },
    )
    return {"success": True, "id": request.memory_id}


@router.post("/search")
async def search_memory(request: SearchMemoryRequest):
    where = None
    if request.memory_type:
        where = {"type": request.memory_type}

    results = await vector_store.search(
        query=request.query,
        user_id=request.user_id,
        n_results=request.n_results,
        where=where,
    )
    return {"success": True, "data": results}


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str):
    await vector_store.delete_memory(memory_id)
    return {"success": True}


@router.post("/embed")
async def create_embedding(data: Dict[str, str]):
    text = data.get("text")
    if not text:
        raise HTTPException(400, "Text required")
    embedding = await vector_store.embed(text)
    return {"success": True, "data": {"embedding": embedding, "dimensions": len(embedding)}}
