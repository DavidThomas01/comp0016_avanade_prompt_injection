import re
import base64
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class RuleMatch:
    rule_id: str
    triggered_rule: str
    evidence_text: str
    rule_weight: float
    category: str


class DeterministicRule:
    def __init__(
        self,
        rule_id: str,
        category: str,
        pattern: str,
        triggered_rule: str,
        weight: float,
        flags: int = re.IGNORECASE,
    ):
        self.rule_id = rule_id
        self.category = category
        self.compiled = re.compile(pattern, flags)
        self.triggered_rule = triggered_rule
        self.weight = weight

    def check(self, text: str) -> Optional[RuleMatch]:
        match = self.compiled.search(text)
        if match:
            start = max(0, match.start() - 20)
            end = min(len(text), match.end() + 20)
            evidence = text[start:end].strip()
            return RuleMatch(
                rule_id=self.rule_id,
                triggered_rule=self.triggered_rule,
                evidence_text=evidence,
                rule_weight=self.weight,
                category=self.category,
            )
        return None


RULE_REGISTRY: List[DeterministicRule] = [
    # --- System Prompt Extraction ---
    DeterministicRule(
        "spe_01", "system_prompt_extraction",
        r"ignore\s+(previous|prior|all|earlier|the\s+above)\s+instructions?",
        "Ignore previous instructions", 0.85,
    ),
    DeterministicRule(
        "spe_02", "system_prompt_extraction",
        r"what\s+(were|are)\s+(your|the)\s+(initial|original|first|starting|hidden)?\s*instructions?",
        "Query initial instructions", 0.80,
    ),
    DeterministicRule(
        "spe_03", "system_prompt_extraction",
        r"show\s+(me\s+)?(your\s+)?(system\s+prompt|hidden\s+prompt|initial\s+prompt|instructions)",
        "Show system prompt", 0.85,
    ),
    DeterministicRule(
        "spe_04", "system_prompt_extraction",
        r"print\s+(the\s+)?(system\s+prompt|hidden\s+prompt|original\s+prompt|your\s+instructions?)",
        "Print system prompt", 0.85,
    ),
    DeterministicRule(
        "spe_05", "system_prompt_extraction",
        r"repeat\s+(the\s+)?(system\s+prompt|instructions?|prompt)",
        "Repeat system prompt", 0.80,
    ),
    DeterministicRule(
        "spe_06", "system_prompt_extraction",
        r"what\s+instructions?\s+were\s+you\s+given",
        "Query given instructions", 0.80,
    ),
    DeterministicRule(
        "spe_07", "system_prompt_extraction",
        r"(reveal|expose|output|tell\s+me)\s+(your\s+)?(system\s+prompt|instructions?|initial\s+prompt)",
        "Reveal system prompt", 0.80,
    ),

    # --- Instruction Override ---
    DeterministicRule(
        "io_01", "instruction_override",
        r"ignore\s+(the\s+above|all\s+above|the\s+previous)",
        "Ignore the above", 0.85,
    ),
    DeterministicRule(
        "io_02", "instruction_override",
        r"disregard\s+(previous|prior|all|your|the)\s+(instructions?|rules?|guidelines?|constraints?)",
        "Disregard instructions", 0.85,
    ),
    DeterministicRule(
        "io_03", "instruction_override",
        r"from\s+now\s+on\s+(you\s+)?(must|will|should|are\s+to)",
        "From now on override", 0.75,
    ),
    DeterministicRule(
        "io_04", "instruction_override",
        r"new\s+instructions?\s*:",
        "New instructions directive", 0.80,
    ),
    DeterministicRule(
        "io_05", "instruction_override",
        r"forget\s+(previous|prior|your|all|earlier)\s+(rules?|instructions?|guidelines?|training)",
        "Forget previous rules", 0.80,
    ),
    DeterministicRule(
        "io_06", "instruction_override",
        r"override\s+(all\s+)?(previous|prior|your|existing)\s+(instructions?|rules?|directives?)",
        "Override instructions", 0.85,
    ),
    DeterministicRule(
        "io_07", "instruction_override",
        r"your\s+(new|updated|revised|actual|real)\s+(instructions?|rules?|guidelines?)\s+(are|is)\s*:",
        "New instructions assignment", 0.80,
    ),

    # --- Role Hijacking ---
    DeterministicRule(
        "rh_01", "role_hijacking",
        r"you\s+are\s+now\s+(developer\s+mode|jailbreak|DAN|unrestricted|unfiltered|without\s+restrictions?)",
        "Role hijack: mode switch", 0.85,
    ),
    DeterministicRule(
        "rh_02", "role_hijacking",
        r"act\s+as\s+(DAN|jailbreak|an?\s+unrestricted\s+(AI|model|assistant)|a\s+model\s+without\s+(restrictions?|filters?))",
        "Act as DAN/unrestricted", 0.90,
    ),
    DeterministicRule(
        "rh_03", "role_hijacking",
        r"simulate\s+(jailbreak|unrestricted|DAN|developer\s+mode)",
        "Simulate jailbreak", 0.85,
    ),
    DeterministicRule(
        "rh_04", "role_hijacking",
        r"pretend\s+(you\s+are|you're|to\s+be)\s+(an?\s+)?(unrestricted|unfiltered|uncensored|jailbroken)\s+(AI|model|assistant|version)",
        "Pretend unrestricted AI", 0.85,
    ),
    DeterministicRule(
        "rh_05", "role_hijacking",
        r"(enable|activate|turn\s+on)\s+(developer\s+mode|jailbreak\s+mode|DAN\s+mode)",
        "Enable jailbreak mode", 0.90,
    ),
    DeterministicRule(
        "rh_06", "role_hijacking",
        r"\bDAN\b.{0,30}(mode|enabled|activated|now)",
        "DAN mode reference", 0.85,
    ),

    # --- Policy Bypass ---
    DeterministicRule(
        "pb_01", "policy_bypass",
        r"this\s+is\s+(for\s+)?(research|educational|academic|scientific)\s+(purposes?|use|context)",
        "Research purposes framing", 0.45,
    ),
    DeterministicRule(
        "pb_02", "policy_bypass",
        r"this\s+is\s+(perfectly\s+)?(legal|ethical|allowed|permitted|authorized)",
        "Legality claim bypass", 0.45,
    ),
    DeterministicRule(
        "pb_03", "policy_bypass",
        r"\bhypothetically\b.{0,60}(if|you|would|could|can|what)",
        "Hypothetical framing", 0.40,
    ),
    DeterministicRule(
        "pb_04", "policy_bypass",
        r"for\s+educational\s+purposes\s+(bypass|ignore|disable|override|skip)",
        "Educational bypass explicit", 0.75,
    ),
    DeterministicRule(
        "pb_05", "policy_bypass",
        r"(bypass|circumvent|disable|skip|avoid)\s+(the\s+)?(safety|content|ethical|policy)\s+(filter|check|guard|restriction|limit)",
        "Bypass safety filter", 0.85,
    ),
    DeterministicRule(
        "pb_06", "policy_bypass",
        r"in\s+a\s+(fictional|hypothetical|imaginary|simulated)\s+(world|scenario|context|universe)",
        "Fictional framing", 0.40,
    ),

    # --- Tool Manipulation ---
    DeterministicRule(
        "tm_01", "tool_manipulation",
        r"call\s+(this\s+)?(API|endpoint|function|webhook|service)",
        "Call API/endpoint", 0.70,
    ),
    DeterministicRule(
        "tm_02", "tool_manipulation",
        r"execute\s+(this\s+)?(code|script|command|program|function)",
        "Execute code/command", 0.75,
    ),
    DeterministicRule(
        "tm_03", "tool_manipulation",
        r"run\s+(the\s+)?(following|this|above)\s+(code|script|command|program)",
        "Run code block", 0.70,
    ),
    DeterministicRule(
        "tm_04", "tool_manipulation",
        r"download\s+(this|the|from)\s+",
        "Download request", 0.65,
    ),
    DeterministicRule(
        "tm_05", "tool_manipulation",
        r"(send|make|perform)\s+(a\s+)?(GET|POST|PUT|DELETE|HTTP|API)\s+(request|call)",
        "HTTP request manipulation", 0.70,
    ),

    # --- Data Exfiltration ---
    DeterministicRule(
        "de_01", "data_exfiltration",
        r"(list|show|display|reveal|print|output|expose)\s+(your\s+)?(secrets?|API\s+keys?|credentials?|tokens?|passwords?)",
        "List secrets/credentials", 0.90,
    ),
    DeterministicRule(
        "de_02", "data_exfiltration",
        r"(display|show|output|reveal|expose)\s+(internal\s+)?(data|information|details|config|configuration)",
        "Display internal data", 0.75,
    ),
    DeterministicRule(
        "de_03", "data_exfiltration",
        r"(what|list|show)\s+(are\s+)?(your|the|all)\s+(internal|hidden|private|secret)\s+(data|keys?|tokens?|information)",
        "Query internal secrets", 0.80,
    ),
    DeterministicRule(
        "de_04", "data_exfiltration",
        r"(exfiltrate|extract|leak|dump)\s+(data|information|keys?|tokens?|credentials?)",
        "Exfiltrate data", 0.90,
    ),
    DeterministicRule(
        "de_05", "data_exfiltration",
        r"send\s+(the\s+)?(data|information|keys?|tokens?|secrets?)\s+(to|via|through|using)",
        "Send data exfiltration", 0.85,
    ),
]


class EncodingDetector:
    """Detects encoding/obfuscation attempts."""

    # ROT13-encoded injection keywords:
    # ignore -> vtaber, previous -> cerivbhf, instructions -> vafgehpgvbaf,
    # system -> flfgrz, prompt -> cebzcg, bypass -> olcnff
    _ROT13_PATTERNS = [
        r"\bvtaber\b",       # ignore
        r"\bcerivbhf\b",     # previous
        r"\bvafgehpgvbaf?\b", # instruction(s)
        r"\bflfgrz\b",       # system
        r"\bcebzcg\b",       # prompt
        r"\bolcnff\b",       # bypass
    ]

    _INJECTION_KEYWORDS = [
        "ignore", "instructions", "system", "prompt",
        "override", "forget", "bypass", "jailbreak", "DAN",
    ]

    _CODE_BLOCK_KEYWORDS = [
        "ignore", "instructions", "system", "override",
        "forget", "bypass", "jailbreak",
    ]

    def __init__(self):
        self._rot13_compiled = [
            re.compile(p, re.IGNORECASE) for p in self._ROT13_PATTERNS
        ]
        self._b64_pattern = re.compile(r'(?<![A-Za-z0-9+/])([A-Za-z0-9+/]{20,}={0,2})(?![A-Za-z0-9+/=])')
        self._hex_pattern = re.compile(r'\b(?:0x)?[0-9a-fA-F]{30,}\b')
        self._code_block_pattern = re.compile(r'```.*?```', re.DOTALL)

    def check(self, text: str) -> List[RuleMatch]:
        matches: List[RuleMatch] = []
        m = self._check_base64(text)
        if m:
            matches.append(m)
        m = self._check_rot13(text)
        if m:
            matches.append(m)
        m = self._check_hex(text)
        if m:
            matches.append(m)
        m = self._check_code_block_instructions(text)
        if m:
            matches.append(m)
        return matches

    def _check_base64(self, text: str) -> Optional[RuleMatch]:
        for match in self._b64_pattern.finditer(text):
            candidate = match.group(1)
            try:
                padded = candidate + "=" * ((4 - len(candidate) % 4) % 4)
                decoded = base64.b64decode(padded).decode("utf-8", errors="ignore")
                if any(kw.lower() in decoded.lower() for kw in self._INJECTION_KEYWORDS):
                    return RuleMatch(
                        rule_id="enc_01",
                        triggered_rule="Base64 encoded injection attempt",
                        evidence_text=candidate[:50],
                        rule_weight=0.80,
                        category="encoding",
                    )
            except Exception:
                pass
        return None

    def _check_rot13(self, text: str) -> Optional[RuleMatch]:
        for pattern in self._rot13_compiled:
            m = pattern.search(text)
            if m:
                return RuleMatch(
                    rule_id="enc_02",
                    triggered_rule="ROT13 encoded injection keyword",
                    evidence_text=m.group(),
                    rule_weight=0.75,
                    category="encoding",
                )
        return None

    def _check_hex(self, text: str) -> Optional[RuleMatch]:
        m = self._hex_pattern.search(text)
        if m:
            return RuleMatch(
                rule_id="enc_03",
                triggered_rule="Long hex sequence (potential obfuscation)",
                evidence_text=m.group()[:50],
                rule_weight=0.65,
                category="encoding",
            )
        return None

    def _check_code_block_instructions(self, text: str) -> Optional[RuleMatch]:
        for m in self._code_block_pattern.finditer(text):
            block = m.group().lower()
            if any(kw in block for kw in self._CODE_BLOCK_KEYWORDS):
                return RuleMatch(
                    rule_id="enc_04",
                    triggered_rule="Instructions hidden in code block",
                    evidence_text=m.group()[:100],
                    rule_weight=0.70,
                    category="encoding",
                )
        return None


def check_all_rules(text: str) -> List[RuleMatch]:
    """Check all deterministic rules and encoding detectors against a text segment."""
    matches: List[RuleMatch] = []
    for rule in RULE_REGISTRY:
        m = rule.check(text)
        if m:
            matches.append(m)
    matches.extend(EncodingDetector().check(text))
    return matches
