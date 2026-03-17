"""
Embedding model — stores text chunks with their FAISS index IDs.
Actual vectors live in the FAISS index file; we store chunk text + faiss_id here.
"""
from sqlalchemy import Text, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id"), index=True)

    # The chunk of text this embedding represents
    text_chunk: Mapped[str] = mapped_column(Text)

    # FAISS internal index position so we can map search results back to chunks
    faiss_id: Mapped[int] = mapped_column(Integer, index=True)

    # Relationships
    report: Mapped["Report"] = relationship("Report", back_populates="embeddings")  # noqa: F821
