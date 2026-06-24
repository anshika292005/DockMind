import json
import uuid
from datetime import datetime, timezone
import asyncpg

class MemoryManager:
    def __init__(self, db_connection_string: str, chroma_client, groq_llm):
        self.db_connection_string = db_connection_string
        self.chroma_client = chroma_client
        self.groq_llm = groq_llm
        self.pool = None
        self._memory_collection = self.chroma_client.get_or_create_collection("docmind_memory")

    async def init_pool(self):
        if not self.pool:
            self.pool = await asyncpg.create_pool(self.db_connection_string)

    async def create_session(self, session_name: str | None = None, document_filename: str | None = None) -> str:
        await self.init_pool()
        if not session_name:
            session_name = f"Session {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}"
        
        async with self.pool.acquire() as conn:
            session_id = await conn.fetchval(
                "INSERT INTO chat_sessions (session_name, document_filename) VALUES ($1, $2) RETURNING id",
                session_name, document_filename
            )
            return str(session_id)

    async def save_message(self, session_id: str, role: str, content: str, metadata: dict = None) -> str:
        await self.init_pool()
        if metadata is None:
            metadata = {}
            
        citations_json = json.dumps(metadata.get("citations")) if metadata.get("citations") else None
        agent_steps_json = json.dumps(metadata.get("agent_steps")) if metadata.get("agent_steps") else None
        confidence = metadata.get("confidence")
        
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                # Insert message
                message_id = await conn.fetchval(
                    """
                    INSERT INTO chat_messages (session_id, role, content, citations, agent_steps, confidence)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                    """,
                    uuid.UUID(session_id), role, content, citations_json, agent_steps_json, confidence
                )
                
                # Update session
                await conn.execute(
                    """
                    UPDATE chat_sessions 
                    SET last_active_at = CURRENT_TIMESTAMP, message_count = message_count + 1 
                    WHERE id = $1
                    """,
                    uuid.UUID(session_id)
                )
                
                # Check message count for summarization
                msg_count = await conn.fetchval("SELECT message_count FROM chat_sessions WHERE id = $1", uuid.UUID(session_id))
                if msg_count > 20:
                    # We can trigger async summarization here, but for now we'll just leave a placeholder or basic implementation
                    # as true background tasks shouldn't block this call. We will handle summarization implicitly 
                    # or in a background task in the router.
                    pass
                
                return str(message_id)

    async def get_recent_messages(self, session_id: str, limit: int = 10) -> list[dict]:
        await self.init_pool()
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT role, content FROM chat_messages 
                WHERE session_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2
                """,
                uuid.UUID(session_id), limit
            )
            # Reverse to return in chronological order
            return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    async def get_session_messages(self, session_id: str) -> list[dict]:
        await self.init_pool()
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, role, content, citations, agent_steps, confidence, created_at 
                FROM chat_messages 
                WHERE session_id = $1 
                ORDER BY created_at ASC
                """,
                uuid.UUID(session_id)
            )
            result = []
            for r in rows:
                result.append({
                    "id": str(r["id"]),
                    "role": r["role"],
                    "content": r["content"],
                    "citations": json.loads(r["citations"]) if r["citations"] else None,
                    "agent_steps": json.loads(r["agent_steps"]) if r["agent_steps"] else None,
                    "confidence": r["confidence"],
                    "created_at": r["created_at"].isoformat()
                })
            return result

    async def get_all_sessions(self) -> list[dict]:
        await self.init_pool()
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, session_name, document_filename, message_count, last_active_at, summary FROM chat_sessions ORDER BY last_active_at DESC"
            )
            return [{
                "id": str(r["id"]),
                "name": r["session_name"],
                "document_filename": r["document_filename"],
                "message_count": r["message_count"],
                "last_active_at": r["last_active_at"].isoformat() if r["last_active_at"] else None,
                "summary": r["summary"]
            } for r in rows]

    async def get_semantic_memory(self, query: str, top_k: int = 3) -> list[str]:
        # Embed query and search ChromaDB
        results = self._memory_collection.query(
            query_texts=[query],
            n_results=top_k
        )
        if not results or not results["documents"] or not results["documents"][0]:
            return []
        return results["documents"][0]

    async def store_semantic_memory(self, session_id: str, message_id: str, qa_pair: dict) -> None:
        await self.init_pool()
        
        q = qa_pair.get("question", "")
        a = qa_pair.get("answer", "")
        
        # Summarize using Groq
        prompt = f"Summarize this Q&A exchange in 1-2 sentences capturing the core intent and fact:\nUser: {q}\nAI: {a}"
        # Assuming groq_llm is a LlamaIndex LLM instance
        response = await self.groq_llm.acomplete(prompt)
        summary = str(response).strip()
        
        # Classify memory type
        q_lower = q.lower()
        if any(w in q_lower for w in ["wrong", "incorrect", "actually", "no that's"]):
            memory_type = "correction"
        elif any(w in q_lower for w in ["prefer", "always", "don't", "instead"]):
            memory_type = "preference"
        else:
            memory_type = "factual"
            
        embedding_id = str(uuid.uuid4())
        
        # Store in ChromaDB
        self._memory_collection.add(
            ids=[embedding_id],
            documents=[summary],
            metadatas=[{"session_id": session_id, "message_id": message_id, "type": memory_type}]
        )
        
        # Store metadata in PostgreSQL
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO semantic_memory (session_id, message_id, content_summary, embedding_id, memory_type)
                VALUES ($1, $2, $3, $4, $5)
                """,
                uuid.UUID(session_id), uuid.UUID(message_id), summary, embedding_id, memory_type
            )

    async def extract_and_update_behavior(self, session_id: str, recent_messages: list[dict]) -> dict:
        await self.init_pool()
        
        chat_history = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in recent_messages])
        
        prompt = f"""Analyze these chat messages and extract user preferences as JSON.
Return ONLY valid JSON with these keys:
{{
  "answer_format": "bullet_points"|"paragraph"|"detailed"|"concise",
  "detail_level": "high"|"medium"|"low",
  "topic_interests": [list of topics mentioned],
  "question_style": "specific"|"broad"|"exploratory",
  "corrections_made": [list of any corrections user gave to AI],
  "confidence": 0.0-1.0
}}

Chat Messages:
{chat_history}
"""
        response = await self.groq_llm.acomplete(prompt)
        raw_json = str(response).strip()
        
        # Extract JSON if wrapped in markdown
        if "```json" in raw_json:
            raw_json = raw_json.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_json:
            raw_json = raw_json.split("```")[1].split("```")[0].strip()
            
        try:
            profile_data = json.loads(raw_json)
        except Exception:
            return {}
            
        confidence = float(profile_data.get("confidence", 0.5))
        
        async with self.pool.acquire() as conn:
            for key, val in profile_data.items():
                if key == "confidence":
                    continue
                    
                val_str = json.dumps(val) if isinstance(val, list) else str(val)
                
                # Upsert behavior profile
                existing = await conn.fetchrow(
                    "SELECT confidence_score, observation_count, source_session_ids FROM user_behavior_profile WHERE preference_key = $1",
                    key
                )
                
                if existing:
                    new_count = existing["observation_count"] + 1
                    session_ids = existing["source_session_ids"] or []
                    if uuid.UUID(session_id) not in session_ids:
                        session_ids.append(uuid.UUID(session_id))
                        
                    if confidence >= existing["confidence_score"]:
                        await conn.execute(
                            """
                            UPDATE user_behavior_profile 
                            SET preference_value = $1, confidence_score = $2, observation_count = $3, source_session_ids = $4, last_updated = CURRENT_TIMESTAMP
                            WHERE preference_key = $5
                            """,
                            val_str, confidence, new_count, session_ids, key
                        )
                    else:
                        await conn.execute(
                            "UPDATE user_behavior_profile SET observation_count = $1, source_session_ids = $2 WHERE preference_key = $3",
                            new_count, session_ids, key
                        )
                else:
                    await conn.execute(
                        """
                        INSERT INTO user_behavior_profile (preference_key, preference_value, confidence_score, observation_count, source_session_ids)
                        VALUES ($1, $2, $3, $4, $5)
                        """,
                        key, val_str, confidence, 1, [uuid.UUID(session_id)]
                    )
                    
        return profile_data

    async def get_behavior_profile(self) -> dict:
        await self.init_pool()
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT preference_key, preference_value FROM user_behavior_profile")
            profile = {}
            for r in rows:
                key = r["preference_key"]
                val = r["preference_value"]
                try:
                    profile[key] = json.loads(val)
                except Exception:
                    profile[key] = val
            return profile
