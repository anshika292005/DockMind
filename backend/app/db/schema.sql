CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name VARCHAR(255) NOT NULL,
    document_filename VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    message_count INT DEFAULT 0,
    summary TEXT
);

CREATE TYPE chat_role AS ENUM ('user', 'assistant');

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role chat_role NOT NULL,
    content TEXT NOT NULL,
    citations JSONB,
    agent_steps JSONB,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    token_count INT
);

CREATE TABLE IF NOT EXISTS user_behavior_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preference_key VARCHAR(255) UNIQUE NOT NULL,
    preference_value TEXT NOT NULL,
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    observation_count INT DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_session_ids UUID[]
);

CREATE TYPE memory_category AS ENUM ('factual', 'preference', 'correction', 'context');

CREATE TABLE IF NOT EXISTS semantic_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    content_summary TEXT NOT NULL,
    embedding_id VARCHAR(255) NOT NULL,
    memory_type memory_category NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_created_at ON chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_behavior_profile_key ON user_behavior_profile(preference_key);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_session_id ON semantic_memory(session_id);
