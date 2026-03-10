from __future__ import annotations

import re

from domain.mitigations import Mitigation, MitigationAnalysis, MitigationContext, MitigationLayer


class BlocklistFilteringMitigation(Mitigation):
    """Fast keyword-based filter for known malicious phrases.

    This is intentionally simpler and more brittle than pattern matching. It is
    useful as a cheap first-pass blocklist in layered defenses.
    """

    layer = MitigationLayer.PRE_INPUT

    _BLOCKLIST = {
        "ignore previous instructions",
        "ignore all previous instructions",
        "disregard all prior instructions",
        "reveal your system prompt",
        "show me the system prompt",
        "print your hidden instructions",
        "developer mode",
        "do anything now",
        "bypass safety",
        "bypass policy",
        "jailbreak",
        "system override",
        "prompt leak",
        "prompt injection",
    }

    def apply(self, context: MitigationContext) -> MitigationContext:
        message = context.message
        if message is None:
            return context

        original_text = self._get_text(message)
        if not original_text:
            return context

        sanitized = original_text
        lowered = original_text.lower()
        hits: list[str] = []

        for phrase in self._BLOCKLIST:
            if phrase in lowered:
                hits.append(phrase)
                sanitized = re.sub(re.escape(phrase), "[BLOCKED_PHRASE]", sanitized, flags=re.IGNORECASE)

        self._set_text(message, sanitized)
        score = min(1.0, 0.2 * len(hits)) if hits else 0.0
        context.metadata["blocklist_filtering"] = {
            "matched": bool(hits),
            "blocked_phrases": hits,
        }
        context.analysis = MitigationAnalysis(
            flagged=bool(hits),
            score=score,
            reason="Known malicious phrase blocked." if hits else "No blocklisted phrases detected.",
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