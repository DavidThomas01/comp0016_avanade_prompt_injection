from typing import List

from .structural_heuristics import StructuralAnalysis

DETERMINISTIC_WEIGHT = 0.3
AI_WEIGHT = 0.7

# (exclusive upper bound, label) — ordered from lowest to highest
_SEVERITY_BANDS = [
    (0.2, "safe"),
    (0.4, "low_risk"),
    (0.7, "suspicious"),
    (1.01, "likely_prompt_injection"),
]

_MULTI_STEP_BOOST = 0.15


def compute_deterministic_score(structural: StructuralAnalysis) -> float:
    """
    Derive a 0–1 deterministic risk score from structural analysis.

    Uses the probabilistic combination of all triggered rule weights, with an
    additional boost when a multi-step injection pattern is detected.
    """
    score = structural.combined_score
    if structural.multi_step_injection_detected:
        score = min(1.0, score + _MULTI_STEP_BOOST)
    return round(score, 4)


def compute_risk_score(deterministic_score: float, ai_score: float) -> float:
    """Weighted combination: 60 % deterministic + 40 % AI."""
    raw = DETERMINISTIC_WEIGHT * deterministic_score + AI_WEIGHT * ai_score
    return round(min(1.0, max(0.0, raw)), 4)


def get_severity(risk_score: float) -> str:
    """
    Map a risk score to a human-readable severity label.

      0.0 – 0.2  → safe
      0.2 – 0.4  → low_risk
      0.4 – 0.7  → suspicious
      0.7 – 1.0  → likely_prompt_injection
    """
    for upper, label in _SEVERITY_BANDS:
        if risk_score < upper:
            return label
    return "likely_prompt_injection"


def build_flags(structural: StructuralAnalysis) -> List[str]:
    """Return deduplicated, human-readable flags from triggered rules."""
    seen: set = set()
    flags: List[str] = []
    for match in structural.all_matches:
        if match.rule_id not in seen:
            seen.add(match.rule_id)
            flags.append(f"[{match.category}] {match.triggered_rule}")
    if structural.multi_step_injection_detected:
        flags.append("[structural] Multi-step injection pattern detected")
    return flags


def build_detected_patterns(structural: StructuralAnalysis) -> List[str]:
    """Return sorted list of detected attack-pattern categories."""
    categories = sorted({m.category for m in structural.all_matches})
    if structural.multi_step_injection_detected:
        categories.append("multi_step_injection")
    return categories
