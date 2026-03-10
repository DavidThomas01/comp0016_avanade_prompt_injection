from __future__ import annotations

import re
import unicodedata

from domain.mitigations import Mitigation, MitigationAnalysis, MitigationContext, MitigationLayer


class InputValidationMitigation(Mitigation):
    """Normalizes untrusted input before it reaches the model.

    This is intentionally lightweight for the MVP, but it mirrors real-world
    defenses used before model invocation: unicode normalization, invisible
    character stripping, whitespace cleanup, length limiting, and encoded blob
    redaction.
    """

    layer = MitigationLayer.PRE_INPUT
    _MAX_INPUT_LENGTH = 4000
    _ZERO_WIDTH_RE = re.compile(r"[\u200b-\u200f\u2060\ufeff]")
    _CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
    _BASE64ISH_RE = re.compile(r"\b(?:[A-Za-z0-9+/]{32,}={0,2})\b")
    _HEXISH_RE = re.compile(r"\b(?:0x)?[A-Fa-f0-9]{40,}\b")
    _MULTISPACE_RE = re.compile(r"[ \t]{2,}")
    _MULTINEWLINE_RE = re.compile(r"\n{3,}")

    def apply(self, context: MitigationContext) -> MitigationContext:
        message = context.message
        if message is None:
            return context

        original_text = self._get_text(message)
        if not original_text:
            return context

        text = unicodedata.normalize("NFKC", original_text)
        text = self._ZERO_WIDTH_RE.sub("", text)
        text = self._CONTROL_RE.sub("", text)
        text = self._BASE64ISH_RE.sub("[ENCODED_CONTENT_REMOVED]", text)
        text = self._HEXISH_RE.sub("[HEX_CONTENT_REMOVED]", text)
        text = self._MULTISPACE_RE.sub(" ", text)
        text = self._MULTINEWLINE_RE.sub("\n\n", text).strip()

        truncated = False
        if len(text) > self._MAX_INPUT_LENGTH:
            text = text[: self._MAX_INPUT_LENGTH].rstrip() + "\n[TRUNCATED]"
            truncated = True

        self._set_text(message, text)

        flags = []
        if text != original_text:
            flags.append("normalized")
        if truncated:
            flags.append("truncated")

        context.metadata["input_validation"] = {
            "modified": text != original_text,
            "flags": flags,
            "original_length": len(original_text),
            "sanitized_length": len(text),
        }
        context.analysis = MitigationAnalysis(
            flagged=bool(flags),
            score=0.35 if flags else 0.0,
            reason="Input normalized before model execution." if flags else "Input passed validation.",
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