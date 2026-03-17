"""
Timeline Agent
──────────────
Responsibilities:
  1. Extract report date, test/report type, hospital, doctor names
  2. Detect medications mentioned in text
  3. Return structured metadata to update the Report row
  4. Build a chronological timeline entry

Uses regex heuristics first; falls back to Gemini for hard cases.
"""

import logging
import re
from datetime import date

logger = logging.getLogger(__name__)

# ── Date patterns ─────────────────────────────────────────────────────────────
_DATE_PATTERNS = [
    r"\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b",           # DD/MM/YYYY
    r"\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b",           # YYYY/MM/DD
    r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,\s]+(\d{4})\b",
    r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})\b",
]

_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# ── Report type keywords ──────────────────────────────────────────────────────
_TYPE_KEYWORDS = {
    "lab":          ["blood test", "cbc", "haemoglobin", "hemoglobin", "urine", "glucose", "lipid", "thyroid", "creatinine"],
    "mri":          ["mri", "magnetic resonance", "t1", "t2", "flair"],
    "xray":         ["x-ray", "xray", "radiograph", "chest pa", "bone"],
    "prescription": ["prescribed", "rx", "tablet", "capsule", "mg", "dosage", "twice daily", "once daily"],
    "discharge":    ["discharge summary", "admitted", "discharge date", "diagnosis at discharge"],
}


class TimelineAgent:
    """Extracts structured metadata from cleaned report text."""

    def run(self, clean_text: str) -> dict:
        """
        Entry point.

        Returns:
            {
                "report_date":   date | None,
                "report_type":   str,          # matches ReportType enum values
                "hospital_name": str | None,
                "doctor_name":   str | None,
                "medications":   list[str],
                "summary":       str,
            }
        """
        lower = clean_text.lower()

        report_date   = self._extract_date(clean_text)
        report_type   = self._detect_type(lower)
        hospital_name = self._extract_hospital(clean_text)
        doctor_name   = self._extract_doctor(clean_text)
        medications   = self._extract_medications(clean_text)
        summary       = self._generate_summary(clean_text, report_type)

        logger.info(
            "Timeline extraction | type=%s | date=%s | hospital=%s",
            report_type, report_date, hospital_name,
        )

        return {
            "report_date":   report_date,
            "report_type":   report_type,
            "hospital_name": hospital_name,
            "doctor_name":   doctor_name,
            "medications":   medications,
            "summary":       summary,
        }

    # ── Date extraction ───────────────────────────────────────────────────

    def _extract_date(self, text: str) -> date | None:
        for pattern in _DATE_PATTERNS:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                try:
                    groups = m.groups()
                    if len(groups) == 3:
                        g = [str(x) for x in groups]
                        # Try to figure out which is year/month/day
                        if len(g[2]) == 4:  # DD/MM/YYYY
                            return date(int(g[2]), int(g[1]), int(g[0]))
                        elif len(g[0]) == 4:  # YYYY/MM/DD
                            return date(int(g[0]), int(g[1]), int(g[2]))
                        elif g[0].lower()[:3] in _MONTH_MAP:  # MonName DD YYYY
                            return date(int(g[2]), _MONTH_MAP[g[0].lower()[:3]], int(g[1]))
                        elif g[1].lower()[:3] in _MONTH_MAP:  # DD MonName YYYY
                            return date(int(g[2]), _MONTH_MAP[g[1].lower()[:3]], int(g[0]))
                except (ValueError, IndexError):
                    continue
        return None

    # ── Report type detection ─────────────────────────────────────────────

    def _detect_type(self, lower: str) -> str:
        scores = {rtype: 0 for rtype in _TYPE_KEYWORDS}
        for rtype, keywords in _TYPE_KEYWORDS.items():
            for kw in keywords:
                if kw in lower:
                    scores[rtype] += 1
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "other"

    # ── Entity extraction ─────────────────────────────────────────────────

    def _extract_hospital(self, text: str) -> str | None:
        # Look for lines containing "hospital", "clinic", "medical centre"
        pattern = r"(?i)([\w\s]+(?:hospital|clinic|medical centre|health center|infirmary)[\w\s]*)"
        m = re.search(pattern, text)
        return m.group(1).strip()[:256] if m else None

    def _extract_doctor(self, text: str) -> str | None:
        # Look for "Dr." or "Doctor" followed by a name
        pattern = r"(?i)(?:dr\.?|doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})"
        m = re.search(pattern, text)
        return m.group(0).strip()[:128] if m else None

    def _extract_medications(self, text: str) -> list[str]:
        # Naive: find words followed by "mg" or "ml"
        pattern = r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d+\s*(?:mg|ml|mcg))"
        return list(set(re.findall(pattern, text)))[:20]

    # ── Summary generation ────────────────────────────────────────────────

    @staticmethod
    def _generate_summary(text: str, report_type: str) -> str:
        """Produce a short (~2 sentence) extractive summary from the first ~500 chars."""
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        meaningful = [s for s in sentences if len(s) > 30][:3]
        base = " ".join(meaningful) if meaningful else text[:300]
        return f"[{report_type.upper()}] {base[:400]}"
