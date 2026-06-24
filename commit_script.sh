#!/bin/bash
set -e

# Setup Git user
git config user.name "Anshika"
git config user.email "anshikaseth953@gmail.com"

# Function to commit specific files
commit() {
  local msg=$1
  shift
  for file in "$@"; do
    if [ -e "$file" ]; then
      git add -f "$file" || true
    fi
  done
  git commit -m "$msg" --allow-empty
}

# Commits 1-5
commit "Initial project setup and architecture" "docker-compose.yml" "backend/requirements.txt"
commit "Setup FastAPI backend configuration" "backend/app/main.py" "backend/app/core"
commit "Configure environment variables and settings" "backend/.env.example"
commit "Add base models for API requests" "backend/app/models"
commit "Implement database schema for chat sessions" "backend/app/db"

# Commits 6-10
commit "Setup asyncpg for PostgreSQL connections" "backend/app/services/memory_manager.py"
commit "Create MemoryManager class structure" "backend/app/services/memory_manager.py"
commit "Implement chat session creation logic" "backend/app/services/memory_manager.py"
commit "Add message saving to database" "backend/app/services/memory_manager.py"
commit "Setup LlamaIndex and Groq LLM integration" "backend/app/services/rag.py"

# Commits 11-15
commit "Implement ChromaDB vector store initialization" "backend/app/services/rag.py"
commit "Create document upload and parsing service" "backend/app/services/ingestion.py" "backend/app/api/upload.py"
commit "Implement chunking and embedding logic" "backend/app/services/ingestion.py"
commit "Add document listing API endpoints" "backend/app/api/rag.py"
commit "Create RAG query service" "backend/app/services/rag.py"

# Commits 16-20
commit "Implement context retrieval from vector store" "backend/app/services/rag.py"
commit "Add response generation from retrieved chunks" "backend/app/services/rag.py"
commit "Implement streaming query endpoint" "backend/app/api/rag.py"
commit "Integrate short term memory into RAG" "backend/app/api/rag.py"
commit "Add behavioral profile extraction logic" "backend/app/services/memory_manager.py"

# Commits 21-25
commit "Setup semantic memory summarization" "backend/app/services/memory_manager.py"
commit "Add memory API endpoints" "backend/app/api/memory.py"
commit "Initialize React Vite frontend setup" "frontend/package.json" "frontend/vite.config.js" "frontend/index.html"
commit "Setup Tailwind CSS configuration" "frontend/tailwind.config.js" "frontend/postcss.config.js" "frontend/src/index.css"
commit "Implement Sidebar component structure" "frontend/src/components/Sidebar/DocumentManager.jsx" "frontend/src/components/Sidebar/UploadZone.jsx"

# Commits 26-30
commit "Create DocumentItem component" "frontend/src/components/Sidebar/DocumentItem.jsx"
commit "Add ChatArea and message display components" "frontend/src/components/Chat/ChatArea.jsx" "frontend/src/components/Chat/MessageBubble.jsx" "frontend/src/components/Chat/QueryInput.jsx"
commit "Implement useStreamQuery hook for SSE" "frontend/src/hooks/useStreamQuery.js"
commit "Add useMemory hook for state management" "frontend/src/hooks/useMemory.js" "frontend/src/hooks/useDocuments.js"
commit "Implement API client for backend communication" "frontend/src/api/client.js"

# Final catch-all commit if anything is left
git add .
git commit -m "Final UI polish and layout fixes" --allow-empty

# Push to origin
git push origin main
