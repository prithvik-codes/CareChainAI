"""
Ingestion Agent
───────────────
Responsibilities:
  1. Detect file type (PDF vs image)
  2. Extract raw text using pdfplumber or Tesseract OCR
  3. Clean the extracted text
  4. Return structured content for downstream agents

This agent is called synchronously from a background task after upload.
"""

import logging
import os
import re
from pathlib import Path
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
logger = logging.getLogger(__name__)


class IngestionAgent:
    """Extracts and cleans text from uploaded medical documents."""

    # ── Public interface ──────────────────────────────────────────────────

    def run(self, file_path: str) -> dict:
        """
        Entry point.

        Returns:
            {
                "file_type": "pdf" | "image",
                "raw_text":  str,
                "clean_text": str,
                "success":   bool,
                "error":     str | None,
            }
        """
        path = Path(file_path)
        if not path.exists():
            return self._error(f"File not found: {file_path}")

        suffix = path.suffix.lower()

        if suffix == ".pdf":
            return self._process_pdf(path)
        elif suffix in {".jpg", ".jpeg", ".png", ".tiff", ".bmp", ".webp"}:
            return self._process_image(path)
        else:
            return self._error(f"Unsupported file type: {suffix}")

    # ── PDF processing ────────────────────────────────────────────────────

    def _process_pdf(self, path: Path) -> dict:
        try:
            import pdfplumber  # lazy import — not needed for image uploads

            text_parts = []
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

            raw = "\n".join(text_parts)
            if not raw.strip():
                logger.warning("pdfplumber found no text — PDF may be scanned; attempting OCR")
                return self._ocr_pdf(path)

            return self._success("pdf", raw)

        except Exception as exc:
            logger.exception("PDF extraction failed")
            return self._error(str(exc))

    def _ocr_pdf(self, path: Path) -> dict:
        """Convert scanned PDF pages to images then run OCR."""
        try:
            from pdf2image import convert_from_path
            images = convert_from_path(str(path), dpi=200)
            texts = [self._tesseract_ocr(img) for img in images]
            return self._success("pdf", "\n".join(texts))
        except Exception as exc:
            return self._error(f"PDF OCR failed: {exc}")

    # ── Image processing ──────────────────────────────────────────────────

    def _process_image(self, path: Path) -> dict:
        try:
            from PIL import Image
            img = Image.open(path)
            text = self._tesseract_ocr(img)
            return self._success("image", text)
        except Exception as exc:
            logger.exception("Image OCR failed")
            return self._error(str(exc))

    def _tesseract_ocr(self, img) -> str:
        import pytesseract
        return pytesseract.image_to_string(img, config="--psm 6")

    # ── Text cleaning ─────────────────────────────────────────────────────

    @staticmethod
    def _clean(raw: str) -> str:
        """Normalise whitespace, remove control characters, collapse blank lines."""
        text = re.sub(r"[^\S\n]+", " ", raw)        # collapse inline spaces
        text = re.sub(r"\n{3,}", "\n\n", text)       # max 2 consecutive newlines
        text = re.sub(r"[^\x20-\x7E\n]", "", text)  # strip non-printable chars
        return text.strip()

    # ── Helpers ───────────────────────────────────────────────────────────

    def _success(self, file_type: str, raw: str) -> dict:
        clean = self._clean(raw)
        logger.info("Ingestion complete | type=%s | chars=%d", file_type, len(clean))
        return {"file_type": file_type, "raw_text": raw, "clean_text": clean, "success": True, "error": None}

    @staticmethod
    def _error(msg: str) -> dict:
        logger.error("Ingestion failed: %s", msg)
        return {"file_type": None, "raw_text": "", "clean_text": "", "success": False, "error": msg}
