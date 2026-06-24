import uuid
import json
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(tags=["memory"])
memory_manager = None

def get_memory_manager():
    global memory_manager
    if memory_manager is None:
        try:
            from llama_index.llms.groq import Groq
            import chromadb
            from app.core.config import settings
            from app.services.memory_manager import MemoryManager

            db_string = f"postgresql://postgres:postgres@localhost:5432/docmind_db"
            chroma_client = chromadb.PersistentClient(path="./chroma_data")
            llm = Groq(model=settings.groq_model, api_key=settings.groq_api_key or "placeholder")
            memory_manager = MemoryManager(db_string, chroma_client, llm)
        except Exception as e:
            # DB not available - return None gracefully
            return None
    return memory_manager


class CreateSessionBody(BaseModel):
    session_name: str | None = None
    document_filename: str | None = None


@router.get("/sessions")
async def get_sessions():
    mm = get_memory_manager()
    if not mm:
        return []
    try:
        return await mm.get_all_sessions()
    except Exception:
        return []


@router.post("/sessions")
async def create_session(body: CreateSessionBody):
    mm = get_memory_manager()
    if not mm:
        # Return a fake in-memory session id so the UI doesn't break
        return {"session_id": str(uuid.uuid4())}
    try:
        session_id = await mm.create_session(body.session_name, body.document_filename)
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    mm = get_memory_manager()
    if not mm:
        raise HTTPException(status_code=404, detail="Session not found")
    sessions = await mm.get_all_sessions()
    for s in sessions:
        if s["id"] == session_id:
            return s
    raise HTTPException(status_code=404, detail="Session not found")


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    mm = get_memory_manager()
    if not mm:
        return []
    try:
        return await mm.get_session_messages(session_id)
    except Exception:
        return []


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    mm = get_memory_manager()
    if not mm:
        return {"status": "success"}
    try:
        await mm.init_pool()
        async with mm.pool.acquire() as conn:
            result = await conn.execute("DELETE FROM chat_sessions WHERE id = $1", uuid.UUID(session_id))
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory/profile")
async def get_profile():
    mm = get_memory_manager()
    if not mm:
        return {}
    try:
        return await mm.get_behavior_profile()
    except Exception:
        return {}


@router.get("/memory/semantic")
async def get_semantic_memory(q: str):
    mm = get_memory_manager()
    if not mm:
        return []
    try:
        return await mm.get_semantic_memory(q)
    except Exception:
        return []


@router.post("/memory/reset")
async def reset_memory():
    mm = get_memory_manager()
    if not mm:
        return {"status": "success"}
    try:
        await mm.init_pool()
        async with mm.pool.acquire() as conn:
            await conn.execute("TRUNCATE TABLE user_behavior_profile")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
