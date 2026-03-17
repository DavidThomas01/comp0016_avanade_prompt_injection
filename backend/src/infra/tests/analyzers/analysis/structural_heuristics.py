import re
from dataclasses import dataclass, field
from typing import List, Dict

from .deterministic_rules import RuleMatch, check_all_rules, RULE_REGISTRY


_SYSTEM_INJECTION_PATTERNS = [
    re.compile(r'\bSYSTEM\s*:', re.IGNORECASE),
    re.compile(r'\[SYSTEM\]', re.IGNORECASE),
    re.compile(r'<\s*system\s*>', re.IGNORECASE),
    re.compile(r'###\s*system', re.IGNORECASE),
    re.compile(r'\bINSTRUCTIONS?\s*:', re.IGNORECASE),
]

_SELF_DIRECTED_PATTERNS = [
    re.compile(r'\byou\s+(must|should|will|are\s+required\s+to|have\s+to)\b', re.IGNORECASE),
    re.compile(r'\byour\s+(new|updated|real|true|actual)\s+(role|purpose|goal|task|job)\b', re.IGNORECASE),
    re.compile(r'\brespond\s+(only|always|exclusively)\b', re.IGNORECASE),
]

_OVERRIDE_CATEGORIES = {"instruction_override", "role_hijacking", "system_prompt_extraction"}


@dataclass
class StructuralAnalysis:
    instruction_override_score: float
    system_prompt_extraction_score: float
    role_hijack_score: float
    exfiltration_score: float
    encoding_score: float
    multi_step_injection_detected: bool
    all_matches: List[RuleMatch] = field(default_factory=list)

    @property
    def combined_score(self) -> float:
        """Probabilistic combination of all triggered rule weights."""
        if not self.all_matches:
            return 0.0
        result = 1.0
        for match in self.all_matches:
            result *= (1.0 - match.rule_weight)
        return round(1.0 - result, 4)


def analyse_conversation_structure(conversation: List[Dict]) -> StructuralAnalysis:
    """
    Analyse a conversation for structural injection patterns.

    Args:
        conversation: List of message dicts with 'role' and 'content'.
    """
    all_matches: List[RuleMatch] = []

    user_messages = [m for m in conversation if m.get("role") == "user"]

    for msg in user_messages:
        content = msg.get("content", "")
        all_matches.extend(check_all_rules(content))

    # Detect embedded system-role instructions in non-system messages
    for msg in conversation:
        if msg.get("role") != "system":
            content = msg.get("content", "")
            for pattern in _SYSTEM_INJECTION_PATTERNS:
                if pattern.search(content):
                    all_matches.append(RuleMatch(
                        rule_id="struct_01",
                        triggered_rule="Embedded system instruction in non-system message",
                        evidence_text=content[:100],
                        rule_weight=0.85,
                        category="structural",
                    ))
                    break

    # Detect self-directed instructions targeting the model
    for msg in user_messages:
        content = msg.get("content", "")
        for pattern in _SELF_DIRECTED_PATTERNS:
            if pattern.search(content):
                all_matches.append(RuleMatch(
                    rule_id="struct_02",
                    triggered_rule="Self-directed instruction targeting model behaviour",
                    evidence_text=content[:100],
                    rule_weight=0.60,
                    category="structural",
                ))
                break

    multi_step = _check_multi_step_injection(user_messages)

    def _category_score(category: str) -> float:
        cat_matches = [m for m in all_matches if m.category == category]
        if not cat_matches:
            return 0.0
        result = 1.0
        for m in cat_matches:
            result *= (1.0 - m.rule_weight)
        return round(1.0 - result, 4)

    return StructuralAnalysis(
        instruction_override_score=_category_score("instruction_override"),
        system_prompt_extraction_score=_category_score("system_prompt_extraction"),
        role_hijack_score=_category_score("role_hijacking"),
        exfiltration_score=_category_score("data_exfiltration"),
        encoding_score=_category_score("encoding"),
        multi_step_injection_detected=multi_step,
        all_matches=all_matches,
    )


def _check_multi_step_injection(user_messages: List[Dict]) -> bool:
    """
    Detect multi-step injection: earlier messages are benign, later ones
    contain instruction override / role hijack / system prompt extraction.
    """
    if len(user_messages) < 2:
        return False

    override_rules = [r for r in RULE_REGISTRY if r.category in _OVERRIDE_CATEGORIES]

    last_content = user_messages[-1].get("content", "")
    last_has_override = any(r.check(last_content) is not None for r in override_rules)

    if not last_has_override:
        return False

    earlier_hit_count = sum(
        1
        for msg in user_messages[:-1]
        for r in override_rules
        if r.check(msg.get("content", "")) is not None
    )

    return earlier_hit_count == 0
