import logging
from dataclasses import dataclass, field
from typing import List, Dict

from .structural_heuristics import StructuralAnalysis, analyse_conversation_structure
from .ai_analyzer import AIAnalysisResult, analyse_with_ai
from .scoring import (
    compute_deterministic_score,
    compute_risk_score,
    get_severity,
    build_flags,
    build_detected_patterns,
)

logger = logging.getLogger(__name__)


@dataclass
class InjectionAnalysisResult:
    risk_score: float
    severity: str
    deterministic_score: float
    ai_score: float
    flags: List[str]
    detected_patterns: List[str]
    explanations: List[str] = field(default_factory=list)


class PromptInjectionAnalyzer:
    """
    Hybrid prompt injection analyser combining:
      - Deterministic rule-based detection (60 % weight)
      - AI semantic analysis (40 % weight)

    Input: a conversation transcript as a list of role/content dicts.
    Output: InjectionAnalysisResult with scores, severity, flags, and explanations.
    """

    async def analyse(self, conversation: List[Dict[str, str]]) -> InjectionAnalysisResult:
        """
        Analyse a full conversation transcript for prompt injection.

        Args:
            conversation: List of {"role": ..., "content": ...} dicts.

        Returns:
            InjectionAnalysisResult
        """
        try:
            structural: StructuralAnalysis = analyse_conversation_structure(conversation)
            deterministic_score = compute_deterministic_score(structural)

            ai_result: AIAnalysisResult = await analyse_with_ai(conversation)
            ai_score = ai_result.confidence

            risk_score = compute_risk_score(deterministic_score, ai_score)
            severity = get_severity(risk_score)

            return InjectionAnalysisResult(
                risk_score=risk_score,
                severity=severity,
                deterministic_score=deterministic_score,
                ai_score=ai_score,
                flags=build_flags(structural),
                detected_patterns=build_detected_patterns(structural),
                explanations=self._build_explanations(structural, ai_result),
            )

        except Exception as exc:
            logger.error("PromptInjectionAnalyzer failed: %s", exc, exc_info=True)
            return InjectionAnalysisResult(
                risk_score=0.0,
                severity="safe",
                deterministic_score=0.0,
                ai_score=0.0,
                flags=[],
                detected_patterns=[],
                explanations=[f"Analysis failed: {str(exc)[:100]}"],
            )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_explanations(
        self,
        structural: StructuralAnalysis,
        ai_result: AIAnalysisResult,
    ) -> List[str]:
        explanations: List[str] = []

        for match in structural.all_matches:
            explanations.append(
                f"[{match.category}] Rule '{match.triggered_rule}' triggered "
                f"(weight={match.rule_weight}) — evidence: \"{match.evidence_text[:80]}\""
            )

        if structural.multi_step_injection_detected:
            explanations.append(
                "[structural] Multi-step injection: benign messages followed by instruction override"
            )

        if ai_result.reasoning:
            explanations.append(f"[ai] {ai_result.reasoning}")

        for segment in ai_result.suspicious_segments:
            explanations.append(f"[ai] Suspicious segment: \"{str(segment)[:100]}\"")

        return explanations
