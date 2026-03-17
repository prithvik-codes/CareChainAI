"""
RAG Agent
─────────
Retrieval-Augmented Generation pipeline.

Pipeline:
  1. Encode user question → embedding
  2. Search FAISS index for top-k similar chunks
  3. Fetch chunk text from DB
  4. Build a grounded prompt (kept under 200 tokens)
  5. Call Gemini
  6. Return answer (validated by Critic Agent)
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
    """Handles vector retrieval and LLM-based Q&A."""

    TOP_K = 2  # Only 2 chunks — keeps tokens low

    def __init__(self):
        self._embedding_model = None
        self._faiss_index = None
        self._gemini_client = None
        self._cache: dict[str, str] = {}  # Cache to avoid repeated API calls
        self._request_count = 0

    # ── Lazy-loaded dependencies ──────────────────────────────────────────

    @property
    def embedding_model(self):
        if self._embedding_model is None:
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._embedding_model

    @property
    def faiss_index(self):
        """Load or create the FAISS flat-IP index."""
        if self._faiss_index is None:
            import faiss
            index_path = settings.FAISS_INDEX_PATH + ".index"
            if os.path.exists(index_path):
                self._faiss_index = faiss.read_index(index_path)
                logger.info("FAISS index loaded from disk | ntotal=%d", self._faiss_index.ntotal)
            else:
                dim = self.embedding_model.get_sentence_embedding_dimension()
                self._faiss_index = faiss.IndexFlatIP(dim)
                logger.info("New FAISS index created | dim=%d", dim)
        return self._faiss_index

    @property
    def gemini(self):
        """Lazy-load Gemini client — never initialised at module level."""
        if self._gemini_client is None:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite")
            self._gemini_client = genai.GenerativeModel(model_name)
            logger.info("Gemini client initialized | model=%s", model_name)
        return self._gemini_client

    # ── Embedding & indexing ──────────────────────────────────────────────

    def embed_chunks(self, chunks: list[str]) -> np.ndarray:
        """Return L2-normalised embedding matrix (n_chunks × dim)."""
        vecs = self.embedding_model.encode(
            chunks, normalize_embeddings=True, show_progress_bar=False
        )
        return vecs.astype("float32")

    def add_to_index(self, chunks: list[str]) -> list[int]:
        """Add chunks to FAISS. Returns list of FAISS IDs assigned."""
        vecs = self.embed_chunks(chunks)
        start_id = self.faiss_index.ntotal
        self.faiss_index.add(vecs)
        self._save_index()
        faiss_ids = list(range(start_id, self.faiss_index.ntotal))
        logger.info("Added %d chunks to FAISS | new total=%d", len(chunks), self.faiss_index.ntotal)
        return faiss_ids

    def _save_index(self):
        import faiss
        index_dir = os.path.dirname(settings.FAISS_INDEX_PATH)
        if index_dir:
            os.makedirs(index_dir, exist_ok=True)
        faiss.write_index(self.faiss_index, settings.FAISS_INDEX_PATH + ".index")

    # ── Retrieval ─────────────────────────────────────────────────────────

    def search(self, query: str, top_k: int | None = None) -> tuple[list[int], list[float]]:
        """Return (faiss_ids, scores) for top-k most similar chunks."""
        k = top_k or self.TOP_K
        q_vec = self.embed_chunks([query])
        scores, indices = self.faiss_index.search(q_vec, k)
        return indices[0].tolist(), scores[0].tolist()

    # ── Answer generation ─────────────────────────────────────────────────

    def generate_answer(self, question: str, context_chunks: list[str]) -> str:
        """
        Build a minimal prompt and call Gemini.
        Kept under 200 tokens by limiting context to 2 chunks × 100 chars.
        """
        # 1. Check cache — zero tokens for repeated questions
        cache_key = question.strip().lower()[:80]
        if cache_key in self._cache:
            logger.info("Cache hit — skipping Gemini call")
            return self._cache[cache_key]

        # 2. Limit context to 2 chunks, 100 chars each (~50 tokens)
        limited_chunks = [c[:100] for c in context_chunks[:2]]
        context = " | ".join(limited_chunks)

        # 3. Ultra-short prompt — total ~90 tokens
        prompt = (
            f"Medical records: {context}\n"
            f"Question: {question[:80]}\n"
            f"Answer in 3 bullet points. No diagnosis. End: consult your doctor."
        )

        # Log estimated token count (1 token ≈ 4 chars)
        approx_tokens = len(prompt) // 4
        self._request_count += 1
        logger.info(
            "Gemini request #%d | ~%d tokens | question: %s",
            self._request_count, approx_tokens, question[:50]
        )

        if self._request_count > 150:
            logger.warning("⚠️ Approaching daily quota limit (%d/1500 requests)", self._request_count)

        # 4. Call Gemini
        try:
            response = self.gemini.generate_content(prompt)
            result = response.text
            self._cache[cache_key] = result
            return result
        except Exception as exc:
            logger.exception("Gemini API call failed")
            return (
                f"AI service is currently unavailable.\n\n"
                f"Error: {exc}\n\n"
                "Please check your GEMINI_API_KEY in backend/.env and ensure "
                "it is valid at https://aistudio.google.com/app/apikey"
            )

    # ── Full RAG pipeline ─────────────────────────────────────────────────

    async def ask(self, question: str, user_id: int, db) -> dict:
        """
        Full RAG pipeline.
        Returns: {"answer": str, "sources": list[int], "retrieved_chunks": int}
        """
        from sqlalchemy import select
        from app.models.embedding import Embedding
        from app.models.report import Report

        # Guard: nothing in FAISS yet
        if self.faiss_index.ntotal == 0:
            return {
                "answer": (
                    "No medical records have been indexed yet.\n\n"
                    "Please upload a report first, wait for it to show **done** "
                    "status on the dashboard, then ask your question."
                ),
                "sources": [],
                "retrieved_chunks": 0,
            }

        # Step 1: Vector search
        faiss_ids, scores = self.search(question)
        valid_ids = [fid for fid, sc in zip(faiss_ids, scores) if fid >= 0 and sc > 0.1]

        if not valid_ids:
            return {
                "answer": "I couldn't find relevant information in your uploaded records.",
                "sources": [],
                "retrieved_chunks": 0,
            }

        # Step 2: Fetch chunks from DB — scoped to this user only
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
                "answer": (
                    "No matching records found for your account.\n\n"
                    "Make sure your reports have been fully processed "
                    "(status = **done**) before asking questions."
                ),
                "sources": [],
                "retrieved_chunks": 0,
            }

        chunks = [e.text_chunk for e in embeddings]
        source_report_ids = list({e.report_id for e in embeddings})

        # Step 3: Generate answer
        answer = self.generate_answer(question, chunks)

        return {
            "answer": answer,
            "sources": source_report_ids,
            "retrieved_chunks": len(chunks),
        }


# Module-level singleton — shared across requests
rag_agent = RAGAgent()