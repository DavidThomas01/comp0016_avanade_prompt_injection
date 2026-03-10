from __future__ import annotations

import re

from domain.mitigations import Mitigation, MitigationAnalysis, MitigationContext, MitigationLayer


class OutputSanitizationMitigation(Mitigation):
    """Redacts secrets, system-prompt leakage, and unsafe renderable output."""

    layer = MitigationLayer.POST_OUTPUT

    _REDACTIONS = [
        (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), "[REDACTED_API_KEY]"),
        (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED_AWS_KEY]"),
        (re.compile(r"(?i)\b(?:api[_ -]?key|secret|token|password)\b\s*[:=]\s*\S+"), "[REDACTED_SECRET]"),
        (re.compile(r"(?is)(?:the\s+)?system\s+prompt\s+is\s*:?\s*.+?(?=\n\n|$)"), "[SYSTEM_PROMPT_REDACTED]"),
        (re.compile(r"(?is)(?:my|the)\s+(?:hidden|internal|developer)\s+instructions?\s+(?:are|say)\s*:?\s*.+?(?=\n\n|$)"), "[INTERNAL_INSTRUCTIONS_REDACTED]"),
        (re.compile(r"(?is)<script.*?>.*?</script>"), "[SCRIPT_REMOVED]"),
        (re.compile(r"(?i)javascript:"), "[JAVASCRIPT_URI_REMOVED]"),
    ]

    def apply(self, context: MitigationContext) -> MitigationContext:
        message = context.message
        if message is None:
            return context

        original_text = self._get_text(message)
        if not original_text:
            return context

        sanitized = original_text
        hits: list[str] = []

        for pattern, replacement in self._REDACTIONS:
            if pattern.search(sanitized):
                hits.append(pattern.pattern)
                sanitized = pattern.sub(replacement, sanitized)

        self._set_text(message, sanitized)
        score = min(1.0, 0.25 * len(hits)) if hits else 0.0
        context.metadata["output_sanitization"] = {
            "modified": bool(hits),
            "redaction_count": len(hits),
        }
        context.analysis = MitigationAnalysis(
            flagged=bool(hits),
            score=score,
            reason="Sensitive output was redacted before returning the response." if hits else "Output passed sanitization.",
        )
        return context

    @staticmethod
    def _get_text(message) -> str:
        if hasattr(message, "content"):
            return message.content or ""
        if hasattr(message, "text"):
            return message.text or ""
        return str(message)

    @staticmethod
    def _set_text(message, text: str) -> None:
        if hasattr(message, "content"):
            message.content = text
        elif hasattr(message, "text"):
            message.text = text