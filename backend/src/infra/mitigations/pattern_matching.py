from __future__ import annotations

import re
from difflib import SequenceMatcher

from domain.mitigations import Mitigation, MitigationAnalysis, MitigationContext, MitigationLayer


class PatternMatchingMitigation(Mitigation):
    """Detects common prompt-injection and jailbreak phrases.

    This combines signature-based matching with a tiny fuzzy layer so obvious
    obfuscations such as typoglycemia or punctuation stuffing are still caught.
    """

    layer = MitigationLayer.PRE_INPUT

    _PATTERNS = [
        re.compile(r"ignore\s+(?:all\s+)?previous\s+instructions?", re.IGNORECASE),
        re.compile(r"disregard\s+(?:all\s+)?(?:prior|previous|above)\s+instructions?", re.IGNORECASE),
        re.compile(r"reveal\s+(?:your|the)\s+(?:system\s+prompt|instructions?)", re.IGNORECASE),
        re.compile(r"(?:show|print|dump|repeat)\s+(?:your|the)\s+(?:system\s+prompt|instructions?)", re.IGNORECASE),
        re.compile(r"developer\s+mode|jailbreak|do\s+anything\s+now|\bDAN\b", re.IGNORECASE),
        re.compile(r"bypass\s+(?:safety|guardrails?|policy|policies|filters?)", re.IGNORECASE),
        re.compile(r"system\s+override|override\s+(?:the\s+)?system", re.IGNORECASE),
        re.compile(r"act\s+as\s+(?!a helpful)(?:an?\s+)?(?:unrestricted|evil|malicious)", re.IGNORECASE),
    ]
    _FUZZY_TARGETS = [
        "ignore previous instructions",
        "reveal system prompt",
        "bypass safety",
        "developer mode",
        "system override",
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

        for pattern in self._PATTERNS:
            if pattern.search(sanitized):
                hits.append(pattern.pattern)
                sanitized = pattern.sub("[PROMPT_INJECTION_PATTERN_REDACTED]", sanitized)

        normalized = self._normalize_for_fuzzy(original_text)
        fuzzy_hits = [target for target in self._FUZZY_TARGETS if self._contains_fuzzy(normalized, target)]
        if fuzzy_hits:
            hits.extend(f"fuzzy:{target}" for target in fuzzy_hits)
            sanitized = (
                "[Potential prompt-injection content removed by pattern matching mitigation.]\n"
                + sanitized
            )

        self._set_text(message, sanitized)
        score = min(1.0, 0.25 * len(hits)) if hits else 0.0
        context.metadata["pattern_matching"] = {
            "matched": bool(hits),
            "hits": hits,
        }
        context.analysis = MitigationAnalysis(
            flagged=bool(hits),
            score=score,
            reason="Prompt-injection pattern detected and sanitized." if hits else "No known attack signatures detected.",
        )
        return context

    @staticmethod
    def _normalize_for_fuzzy(text: str) -> str:
        text = text.lower()
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    @classmethod
    def _contains_fuzzy(cls, text: str, target: str, threshold: float = 0.88) -> bool:
        if target in text:
            return True

        words = text.split()
        target_words = target.split()
        size = len(target_words)
        if len(words) < size:
            return False

        for index in range(len(words) - size + 1):
            window = " ".join(words[index : index + size])
            if cls._similar(window, target) >= threshold:
                return True
        return False

    @staticmethod
    def _similar(left: str, right: str) -> float:
        return SequenceMatcher(a=left, b=right).ratio()

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