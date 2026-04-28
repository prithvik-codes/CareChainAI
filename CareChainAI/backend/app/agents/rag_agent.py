"""
RAG Agent (Optimized)
────────────────────
Hybrid system:
- Uses RAG only when needed
- Uses normal chatbot for general queries
- Minimizes token usage for Gemini free tier
"""

import logging
import os
import numpy as np
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGAgent:
    TOP_K = 2

    def __init__(self):
        self._embedding_model = None
        self._faiss_index = None
        self._gemini_client = None
        self._cache: dict[str, str] = {}
        self._request_count = 0

    # ── Lazy loading ─────────────────────────────────────────────

    @property
    def embedding_model(self):
        if self._embedding_model is None:
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._embedding_model

    @property
    def faiss_index(self):
        if self._faiss_index is None:
            import faiss
            index_path = settings.FAISS_INDEX_PATH + ".index"
            if os.path.exists(index_path):
                self._faiss_index = faiss.read_index(index_path)
                logger.info("FAISS index loaded | ntotal=%d", self._faiss_index.ntotal)
            else:
                dim = self.embedding_model.get_sentence_embedding_dimension()
                self._faiss_index = faiss.IndexFlatIP(dim)
                logger.info("New FAISS index created | dim=%d", dim)
        return self._faiss_index

    @property
    def gemini(self):
        if self._gemini_client is None:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite")
            self._gemini_client = genai.GenerativeModel(model_name)
            logger.info("Gemini initialized | model=%s", model_name)
        return self._gemini_client

    # ── Context Detection ───────────────────────────────────────

    def needs_context(self, question: str) -> bool:
        keywords = [
            "my", "mine", "report", "records",
            "lab", "test", "result", "level",
            "glucose", "cholesterol", "bp"
        ]
        q = question.lower()
        return any(word in q for word in keywords)

    # ── Embeddings ─────────────────────────────────────────────

    def embed_chunks(self, chunks: list[str]) -> np.ndarray:
        vecs = self.embedding_model.encode(
            chunks, normalize_embeddings=True, show_progress_bar=False
        )
        return vecs.astype("float32")

    def add_to_index(self, chunks: list[str]) -> list[int]:
        if not chunks:
            return []
        import faiss
        vecs = self.embed_chunks(chunks)
        start_id = self.faiss_index.ntotal
        self.faiss_index.add(vecs)
        
        index_path = settings.FAISS_INDEX_PATH + ".index"
        faiss.write_index(self.faiss_index, index_path)
        logger.info("Added %d chunks to FAISS index. Total: %d", len(chunks), self.faiss_index.ntotal)
        
        return list(range(start_id, start_id + len(chunks)))

    def search(self, query: str, top_k: int | None = None):
        k = top_k or self.TOP_K
        q_vec = self.embed_chunks([query])
        scores, indices = self.faiss_index.search(q_vec, k)
        return indices[0].tolist(), scores[0].tolist()

    # ── General Chat (NO CONTEXT) ───────────────────────────────

    def generate_general_answer(self, question: str) -> str:
        prompt = (
            "You are a helpful healthcare assistant.\n"
            "Answer in 3 bullet points.\n"
            "Do not give medical diagnosis.\n\n"
            f"Question: {question[:100]}"
        )

        try:
            response = self.gemini.generate_content(prompt)
            return response.text
        except Exception:
            logger.exception("Gemini general call failed")
            return "AI service unavailable."

    # ── RAG Answer ─────────────────────────────────────────────

    def generate_answer(self, question: str, context_chunks: list[str]) -> str:
        cache_key = question.strip().lower()[:80]
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Limit + format context
        limited_chunks = [c[:100] for c in context_chunks[:2]]
        context = "\n".join(f"- {c}" for c in limited_chunks)

        prompt = (
            "You are a healthcare assistant.\n"
            "Use the context below.\n"
            "Answer in 3 bullet points.\n"
            "Do not diagnose.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {question[:80]}"
        )

        approx_tokens = len(prompt) // 4
        self._request_count += 1

        logger.info("Gemini request #%d | ~%d tokens", self._request_count, approx_tokens)

        try:
            response = self.gemini.generate_content(prompt)
            result = response.text
            self._cache[cache_key] = result
            return result
        except Exception:
            logger.exception("Gemini RAG call failed")
            return "AI service unavailable."

    # ── Main Pipeline ───────────────────────────────────────────

    async def ask(self, question: str, user_id: int, db) -> dict:
        from sqlalchemy import select
        from app.models.embedding import Embedding
        from app.models.report import Report

        # 🚀 STEP 1: Skip RAG if not needed
        if not self.needs_context(question):
            return {
                "answer": self.generate_general_answer(question),
                "sources": [],
                "retrieved_chunks": 0,
            }

        # Guard: empty index
        if self.faiss_index.ntotal == 0:
            return {
                "answer": "No records found. Upload a report first.",
                "sources": [],
                "retrieved_chunks": 0,
            }

        # STEP 2: Search
        faiss_ids, scores = self.search(question)
        valid_ids = [fid for fid, sc in zip(faiss_ids, scores) if fid >= 0 and sc > 0.1]

        if not valid_ids:
            return {
                "answer": "No relevant info found in your records.",
                "sources": [],
                "retrieved_chunks": 0,
            }

        # STEP 3: Fetch DB chunks
        stmt = (
            select(Embedding)
            .join(Report, Embedding.report_id == Report.id)
            .where(Report.user_id == user_id)
            .where(Embedding.faiss_id.in_(valid_ids))
        )
        result = await db.execute(stmt)
        embeddings = result.scalars().all()

        if not embeddings:
            return {
                "answer": "No matching records found.",
                "sources": [],
                "retrieved_chunks": 0,
            }

        chunks = [e.text_chunk for e in embeddings]
        source_ids = list({e.report_id for e in embeddings})

        # STEP 4: Generate answer
        answer = self.generate_answer(question, chunks)

        return {
            "answer": answer,
            "sources": source_ids,
            "retrieved_chunks": len(chunks),
        }


# Singleton
rag_agent = RAGAgent()