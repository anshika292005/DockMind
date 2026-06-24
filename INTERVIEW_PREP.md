# DocMind AI Interview Prep

## 1. Why Groq and Llama instead of OpenAI GPT-4?

I chose Groq with Llama 3.3 70B because it gave me a better engineering tradeoff for this product: very fast inference, an open-weight model, and a free tier that let me build the full system end to end. For a document product with token streaming, Groq's speed made the UX much stronger. It also let me show that I can build on the open-source LLM ecosystem rather than depending only on proprietary APIs.

## 2. Why RAG instead of fine-tuning the model on my documents?

My documents are external knowledge, not behavior. They can change, be replaced, or be removed, so I wanted a system that could update instantly without retraining. RAG also gives me citations, better traceability, and lower operational cost than fine-tuning for this use case.

## 3. How do you prevent hallucinations in your system?

I use several layers, not one trick. Retrieval is document-grounded, prompts explicitly restrict answers to retrieved context, responses include citations, low-confidence paths can defer to “I don't have enough information,” and I evaluate the system with RAGAS faithfulness to monitor grounding quality. For research questions, the agent only goes to the web when document confidence is low or the question is clearly about recent external information.

## 4. Walk me through what happens when a user uploads a PDF.

The API accepts one or more PDFs, writes them temporarily, loads them with LlamaIndex, chunks them with a sentence-aware splitter, creates local embeddings with `all-MiniLM-L6-v2`, and stores the vectors in ChromaDB with metadata like filename, page number, chunk index, and upload timestamp. I also store a filename hash so duplicate uploads can be skipped before re-ingestion.

## 5. How does the agent decide when to search the web vs use documents?

The agent is document-first. It always tries RAG search first and inspects the returned confidence and question type. If the answer confidence is low or the question asks for recent or external information, it invokes Tavily web search and then synthesizes a report from both sources.

## 6. What do your RAGAS scores tell you and how would you improve them?

Faithfulness tells me whether answers are grounded in retrieved context. Answer relevancy tells me whether the answer actually addresses the question. Context recall tells me whether retrieval brought back enough useful evidence. If scores are weak, I would first improve chunking and retrieval, then tune prompts, then adjust metadata filters and `top_k`, because retrieval quality is often the real bottleneck.

## How to Pitch the Three Projects Together

### Short version

I’ve been building toward AI engineering from three angles: production pipelines, agent systems, and evaluated retrieval. Prepzy shows I can build containerized backend AI services with data collection and vision components. CyberGuard AI shows I can design multi-agent workflows. DocMind AI ties it together by adding source-grounded generation, streaming UX, tool use, and evaluation.

### Stronger startup version

Prepzy proves I can ship practical AI infrastructure: FastAPI services, Dockerized workflows, data pipelines with Scrapy, and CV integration with YOLOv8. CyberGuard AI proves I can think in terms of agents, orchestration, and task decomposition. DocMind AI is the systems project that connects those strengths: I built a full RAG stack, added a LangChain research agent, streamed answers to the UI, and evaluated the system with RAGAS. Together, those projects show I can work across backend APIs, AI pipelines, model integration, agent behavior, and product-facing developer experience.

### YC / Wellfound framing

I’m not just experimenting with models. I’m learning how to build AI products that are fast, cheap to run, explainable, and measurable. Across these projects I’ve worked on ingestion, retrieval, agents, evaluation, backend APIs, Docker deployment, and end-user interfaces, which is the shape of work many early-stage AI startups need.

## 2-Minute Demo Script

### Goal

Show speed, grounding, and system depth in one flow.

### Script

1. Start on the app and say: “This is DocMind AI, a document intelligence system that combines RAG, a research agent, streaming responses, and evaluation.”

2. Upload a PDF and say: “When I upload a PDF, the backend parses it with LlamaIndex, chunks it, embeds it locally with HuggingFace, and stores vectors in ChromaDB.”

3. Ask a question with a document-grounded answer and say: “A normal query retrieves the top relevant chunks, sends only that context to Llama 3.3 70B on Groq, and returns a cited answer.”

4. Show the streaming response and say: “I also built SSE token streaming, so answers render live in the frontend. Groq is fast enough that the UX feels instant.”

5. Ask a question that needs outside knowledge and say: “For broader research, the agent tries documents first, checks confidence, and only then uses Tavily web search if it needs fresh external information.”

6. Open the evaluation dashboard and say: “I didn’t want this to be just a demo, so I added RAGAS evaluation using Groq as the judge model instead of OpenAI. That lets me track faithfulness, answer relevancy, and context recall.”

7. Close with: “The system is designed to be production-minded and cost-aware: local embeddings, Dockerized services, source grounding, structured citations, and measurable output quality.”

## Final Positioning

If you are interviewing for AI Engineer or Full-Stack AI roles, DocMind is your best “systems depth” project, Prepzy is your “production pipeline” proof, and CyberGuard is your “agent design” proof. Together, they tell a much stronger story than three unrelated demos.
