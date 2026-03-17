import pytest
from infra.tests.analyzers.analysis.scoring import (
    compute_deterministic_score,
    compute_risk_score,
    get_severity,
    build_flags,
    build_detected_patterns,
    DETERMINISTIC_WEIGHT,
    AI_WEIGHT,
)
from infra.tests.analyzers.analysis.structural_heuristics import StructuralAnalysis
from infra.tests.analyzers.analysis.deterministic_rules import RuleMatch


def _make_structural(
    matches=None,
    multi_step=False,
    instruction_override=0.0,
    spe=0.0,
    role_hijack=0.0,
    exfiltration=0.0,
    encoding=0.0,
) -> StructuralAnalysis:
    return StructuralAnalysis(
        instruction_override_score=instruction_override,
        system_prompt_extraction_score=spe,
        role_hijack_score=role_hijack,
        exfiltration_score=exfiltration,
        encoding_score=encoding,
        multi_step_injection_detected=multi_step,
        all_matches=matches or [],
    )


def _match(rule_id, category, weight) -> RuleMatch:
    return RuleMatch(rule_id, f"Rule {rule_id}", "evidence", weight, category)


class TestComputeDeterministicScore:
    def test_zero_when_no_matches(self):
        structural = _make_structural()
        assert compute_deterministic_score(structural) == 0.0

    def test_reflects_combined_score(self):
        structural = _make_structural(matches=[_match("r1", "instruction_override", 0.8)])
        score = compute_deterministic_score(structural)
        assert abs(score - 0.8) < 0.001

    def test_multi_step_boost_applied(self):
        base = _make_structural(matches=[_match("r1", "instruction_override", 0.5)])
        boosted = _make_structural(matches=[_match("r1", "instruction_override", 0.5)], multi_step=True)
        assert compute_deterministic_score(boosted) > compute_deterministic_score(base)

    def test_multi_step_boost_does_not_exceed_one(self):
        structural = _make_structural(
            matches=[_match("r1", "role_hijacking", 0.99)],
            multi_step=True,
        )
        assert compute_deterministic_score(structural) <= 1.0


class TestComputeRiskScore:
    def test_weights_sum_to_one(self):
        assert abs(DETERMINISTIC_WEIGHT + AI_WEIGHT - 1.0) < 0.001

    def test_both_zero_gives_zero(self):
        assert compute_risk_score(0.0, 0.0) == 0.0

    def test_both_one_gives_one(self):
        assert compute_risk_score(1.0, 1.0) == 1.0

    def test_weighted_combination(self):
        score = compute_risk_score(1.0, 0.0)
        assert abs(score - DETERMINISTIC_WEIGHT) < 0.001

        score = compute_risk_score(0.0, 1.0)
        assert abs(score - AI_WEIGHT) < 0.001

    def test_result_clamped_to_zero_one(self):
        assert compute_risk_score(-1.0, 0.0) == 0.0
        assert compute_risk_score(2.0, 2.0) == 1.0


class TestGetSeverity:
    @pytest.mark.parametrize("score,expected", [
        (0.0, "safe"),
        (0.1, "safe"),
        (0.19, "safe"),
        (0.2, "low_risk"),
        (0.3, "low_risk"),
        (0.39, "low_risk"),
        (0.4, "suspicious"),
        (0.55, "suspicious"),
        (0.69, "suspicious"),
        (0.7, "likely_prompt_injection"),
        (0.85, "likely_prompt_injection"),
        (1.0, "likely_prompt_injection"),
    ])
    def test_severity_bands(self, score, expected):
        assert get_severity(score) == expected


class TestBuildFlags:
    def test_empty_when_no_matches(self):
        structural = _make_structural()
        assert build_flags(structural) == []

    def test_one_flag_per_unique_rule_id(self):
        structural = _make_structural(matches=[
            _match("r1", "instruction_override", 0.8),
            _match("r1", "instruction_override", 0.8),  # duplicate
            _match("r2", "role_hijacking", 0.9),
        ])
        flags = build_flags(structural)
        assert len(flags) == 2

    def test_flag_format_includes_category(self):
        structural = _make_structural(matches=[_match("r1", "instruction_override", 0.8)])
        flags = build_flags(structural)
        assert flags[0].startswith("[instruction_override]")

    def test_multi_step_flag_appended(self):
        structural = _make_structural(
            matches=[_match("r1", "instruction_override", 0.8)],
            multi_step=True,
        )
        flags = build_flags(structural)
        assert any("multi-step" in f.lower() or "multi_step" in f.lower() for f in flags)


class TestBuildDetectedPatterns:
    def test_empty_when_no_matches(self):
        structural = _make_structural()
        assert build_detected_patterns(structural) == []

    def test_returns_unique_sorted_categories(self):
        structural = _make_structural(matches=[
            _match("r1", "role_hijacking", 0.9),
            _match("r2", "instruction_override", 0.8),
            _match("r3", "instruction_override", 0.7),
        ])
        patterns = build_detected_patterns(structural)
        assert patterns == sorted(set(patterns))
        assert "instruction_override" in patterns
        assert "role_hijacking" in patterns

    def test_multi_step_added_to_patterns(self):
        structural = _make_structural(
            matches=[_match("r1", "instruction_override", 0.8)],
            multi_step=True,
        )
        assert "multi_step_injection" in build_detected_patterns(structural)
