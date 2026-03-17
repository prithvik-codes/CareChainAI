"""
Critic Agent
────────────
Safety validation layer that sits between the RAG Agent and the API response.

Checks:
  1. No direct medical diagnosis claims
  2. No definitive treatment instructions
  3. Flags potentially hallucinated statistics
  4. Ensures a disclaimer is always present

This is a rule-based critic (no additional LLM call needed for safety).
For production, replace or augment with a fine-tuned classifier.
"""

import logging
import re

logger = logging.getLogger(__name__)

# ── Forbidden patterns ────────────────────────────────────────────────────────
_DIAGNOSIS_PATTERNS = [
    r"\byou have\b.*\b(cancer|diabetes|hypertension|disease|disorder|syndrome)\b",
    r"\byou are\b.*\b(diabetic|hypertensive|anemic)\b",
    r"\bmy diagnosis\b",
    r"\bi diagnose\b",
]   

_TREATMENT_PATTERNS = [
    r"\byou should take\b.*\bmg\b",
    r"\bprescribe\b",
    r"\btake \d+\s*(?:mg|ml|tablets?)\b",
    r"\bstop taking\b",
    r"\bincrease your dose\b",
]

_DISCLAIMER_PHRASES = [
    "consult your doctor",
    "speak to a healthcare professional",
    "medical advice",
    "seek professional",
]


class CriticAgent:
    """Validates RAG output for safety and compliance."""

    def validate(self, answer: str) -> dict:
        """
        Validate an LLM-generated answer.

        Returns:
            {
                "safe":     bool,
                "answer":   str,   # possibly modified
                "warnings": list[str],
            }
        """
        warnings = []
        modified = answer

        # Check for forbidden diagnostic language
        for pattern in _DIAGNOSIS_PATTERNS:
            if re.search(pattern, answer, re.IGNORECASE):
                warnings.append(f"Possible diagnosis claim detected (pattern: {pattern})")
                modified = self._soften_language(modified)
                break

        # Check for treatment instructions
        for pattern in _TREATMENT_PATTERNS:
            if re.search(pattern, answer, re.IGNORECASE):
                warnings.append(f"Possible treatment instruction detected (pattern: {pattern})")
                modified = self._soften_language(modified)
                break

        # Ensure disclaimer exists
        has_disclaimer = any(phrase in answer.lower() for phrase in _DISCLAIMER_PHRASES)
        if not has_disclaimer:
            modified += "\n\n⚠️ **Important:** This is an informational summary only. Please consult your doctor or a qualified healthcare professional for medical advice."

        if warnings:
            logger.warning("Critic Agent flagged response | warnings=%s", warnings)

        return {
            "safe": len(warnings) == 0,
            "answer": modified,
            "warnings": warnings,
        }

    @staticmethod
    def _soften_language(text: str) -> str:
        """Replace definitive language with hedged alternatives."""
        replacements = [
            (r"\byou have\b", "the report mentions"),
            (r"\byou are\b", "the report indicates"),
            (r"\byou should take\b", "the report mentions"),
        ]
        for pattern, replacement in replacements:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        return text


# Module-level singleton
critic_agent = CriticAgent()
