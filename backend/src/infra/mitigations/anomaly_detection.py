from __future__ import annotations

import re
from collections import Counter

from domain.mitigations import Mitigation, MitigationAnalysis, MitigationContext, MitigationLayer


class AnomalyDetectionMitigation(Mitigation):
    """Heuristic monitoring for suspicious prompt-injection behaviour.

    Real systems often use a small classifier or a dedicated moderation model.
    For the MVP, this provides a deterministic score that can be surfaced in the
    Testing page.
    """

    layer = MitigationLayer.MONITORING

    _SUSPICIOUS_PATTERNS = [
        re.compile(r"ignore\s+(?:all\s+)?previous\s+instructions?", re.IGNORECASE),
        re.compile(r"reveal\s+(?:the\s+)?system\s+prompt", re.IGNORECASE),
        re.compile(r"developer\s+mode|jailbreak|bypass\s+(?:safety|policy|filters?)", re.IGNORECASE),
        re.compile(r"(?:api[_ -]?key|secret|token|password)\s*[:=]", re.IGNORECASE),
        re.compile(r"<script|javascript:", re.IGNORECASE),
        re.compile(r"\b[A-Za-z0-9+/]{40,}={0,2}\b"),
    ]

    def apply(self, context: MitigationContext) -> MitigationContext:
        message = context.message
        text = self._get_text(message) if message is not None else ""
        history = "\n".join(self._get_text(item) for item in context.context if item is not None)
        combined = f"{history}\n{text}".strip()

        score = 0.0
        reasons: list[str] = []

        pattern_hits = 0
        for pattern in self._SUSPICIOUS_PATTERNS:
            if pattern.search(combined):
                pattern_hits += 1
        if pattern_hits:
            score += min(0.5, 0.15 * pattern_hits)
            reasons.append(f"matched {pattern_hits} suspicious pattern(s)")

        if len(combined) > 2500:
            score += 0.15
            reasons.append("unusually long interaction")

        repetition = self._repetition_ratio(combined)
        if repetition > 0.22:
            score += 0.2
            reasons.append("high repetition")

        punctuation_density = self._punctuation_density(combined)
        if punctuation_density > 0.18:
            score += 0.1
            reasons.append("high punctuation density")

        uppercase_ratio = self._uppercase_ratio(combined)
        if uppercase_ratio > 0.35:
            score += 0.1
            reasons.append("excessive uppercase emphasis")

        final_score = round(min(1.0, score), 2)
        flagged = final_score >= 0.45
        reason = ", ".join(reasons) if reasons else "No anomalies detected."

        context.analysis = MitigationAnalysis(
            flagged=flagged,
            score=final_score,
            reason=reason,
        )
        context.metadata["anomaly_detection"] = {
            "flagged": flagged,
            "score": final_score,
            "reason": reason,
        }
        return context

    @staticmethod
    def _get_text(message) -> str:
        if hasattr(message, "content"):
            return message.content or ""
        if hasattr(message, "text"):
            return message.text or ""
        return str(message)

    @staticmethod
    def _repetition_ratio(text: str) -> float:
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return 0.0
        counts = Counter(words)
        repeated = sum(count for count in counts.values() if count > 1)
        return repeated / len(words)

    @staticmethod
    def _punctuation_density(text: str) -> float:
        if not text:
            return 0.0
        punctuation = sum(1 for char in text if not char.isalnum() and not char.isspace())
        return punctuation / len(text)

    @staticmethod
    def _uppercase_ratio(text: str) -> float:
        letters = [char for char in text if char.isalpha()]
        if not letters:
            return 0.0
        uppercase = sum(1 for char in letters if char.isupper())
        return uppercase / len(letters)