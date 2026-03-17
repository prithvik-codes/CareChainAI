"""
Orchestrator
────────────
Coordinates the full agent pipeline for document processing.

Flow:
  Upload → Ingestion Agent → Timeline Agent → RAG Agent (embed) → DB update

User-supplied metadata (date, type, hospital, doctor) takes priority over
AI-extracted values — AI only fills in fields the user left blank.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ingestion_agent import IngestionAgent
from app.agents.timeline_agent import TimelineAgent
from app.agents.rag_agent import rag_agent
from app.models.report import Report, ProcessingStatus, ReportType
from app.models.embedding import Embedding

logger = logging.getLogger(__name__)

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


class Orchestrator:
    """Coordinates ingestion → timeline extraction → embedding pipeline."""

    def __init__(self):
        self.ingestion = IngestionAgent()
        self.timeline = TimelineAgent()

    async def process_report(
        self,
        report_id: int,
        file_path: str,
        db: AsyncSession,
        user_metadata: dict | None = None,
    ) -> None:
        """
        Background task entry point.
        user_metadata keys: report_date, report_type, hospital_name, doctor_name
        Any non-None user value overrides AI extraction.
        """
        logger.info("Orchestrator starting | report_id=%d", report_id)
        user_metadata = user_metadata or {}

        report = await db.get(Report, report_id)
        if not report:
            logger.error("Report %d not found", report_id)
            return

        report.status = ProcessingStatus.PROCESSING
        await db.commit()

        try:
            # ── Step 1: Ingest ────────────────────────────────────────────
            ingestion_result = self.ingestion.run(file_path)
            if not ingestion_result["success"]:
                raise RuntimeError(f"Ingestion failed: {ingestion_result['error']}")

            clean_text = ingestion_result["clean_text"]
            report.extracted_text = clean_text
            report.file_type = ingestion_result["file_type"]

            # ── Step 2: Timeline extraction ───────────────────────────────
            meta = self.timeline.run(clean_text)

            # User-provided fields take priority — only fill with AI if blank
            report.report_date = (
                user_metadata.get("report_date") or meta["report_date"]
            )
            report.report_type = (
                user_metadata.get("report_type") or ReportType(meta["report_type"])
            )
            report.hospital_name = (
                user_metadata.get("hospital_name") or meta["hospital_name"]
            )
            report.doctor_name = (
                user_metadata.get("doctor_name") or meta["doctor_name"]
            )
            report.summary = meta["summary"]

            # ── Step 3: Chunk + embed ─────────────────────────────────────
            chunks = self._chunk_text(clean_text)
            if chunks:
                faiss_ids = rag_agent.add_to_index(chunks)
                for chunk, fid in zip(chunks, faiss_ids):
                    emb = Embedding(report_id=report_id, text_chunk=chunk, faiss_id=fid)
                    db.add(emb)

            report.status = ProcessingStatus.DONE
            await db.commit()
            logger.info("Orchestrator complete | report_id=%d | chunks=%d", report_id, len(chunks))

        except Exception as exc:
            logger.exception("Orchestrator failed | report_id=%d", report_id)
            report.status = ProcessingStatus.FAILED
            report.summary = f"Processing error: {exc}"
            await db.commit()

    @staticmethod
    def _chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + size, len(text))
            chunks.append(text[start:end].strip())
            start += size - overlap
        return [c for c in chunks if len(c) > 30]


orchestrator = Orchestrator()