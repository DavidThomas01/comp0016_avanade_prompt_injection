"""Prompt-injection mitigation definitions.

Mirrors the frontend catalogue in frontend/src/app/data/mitigations.ts
so the backend knowledge-base is self-contained.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass(frozen=True)
class MetricSnapshot:
    label: str
    value: int  # percentage 0-100


@dataclass(frozen=True)
class Mitigation:
    id: str
    name: str
    description: str
    strategy: str
    metrics: List[MetricSnapshot]
    defense_flow: List[str]
    implementation: str


# ---------------------------------------------------------------------------
# Full catalogue – one entry per mitigation strategy.
# ---------------------------------------------------------------------------

MITIGATIONS: Dict[str, Mitigation] = {}


def _register(m: Mitigation) -> None:
    MITIGATIONS[m.id] = m


_register(Mitigation(
    id="input-validation",
    name="Input Validation",
    description="Multi-layer input validation with pattern detection and semantic analysis",
    strategy="Multi-layer input validation with pattern detection and semantic analysis",
    metrics=[
        MetricSnapshot(label="Tests Passed", value=95),
        MetricSnapshot(label="False Positives", value=5),
        MetricSnapshot(label="False Negatives", value=0),
    ],
    defense_flow=["Input Received", "Pattern Matching", "Semantic Analysis", "Safe Output"],
    implementation=(
        "function validateInput() {\n"
        "  // Input validation logic here!\n"
        "  return processInput();\n"
        "}"
    ),
))

_register(Mitigation(
    id="pattern-matching",
    name="Pattern Matching",
    description="Detect known attack patterns using signature-based detection",
    strategy="Signature-based detection of known attack patterns and malicious input sequences",
    metrics=[
        MetricSnapshot(label="Tests Passed", value=88),
        MetricSnapshot(label="False Positives", value=8),
        MetricSnapshot(label="False Negatives", value=4),
    ],
    defense_flow=["Input Received", "Pattern Matching", "Threat Detection", "Block/Allow"],
    implementation=(
        "const patterns = [\n"
        "  /ignore.*previous.*instructions/i,\n"
        "  /system.*prompt/i,\n"
        "  /you are.*DAN/i\n"
        "];\n\n"
        "function detectPatterns(input: string): boolean {\n"
        "  return patterns.some(p => p.test(input));\n"
        "}"
    ),
))

_register(Mitigation(
    id="blocklist-filtering",
    name="Blocklist Filtering",
    description="Filter requests based on known malicious phrases and keywords",
    strategy="Maintain and enforce a comprehensive blocklist of malicious phrases and keywords",
    metrics=[
        MetricSnapshot(label="Tests Passed", value=82),
        MetricSnapshot(label="False Positives", value=12),
        MetricSnapshot(label="False Negatives", value=6),
    ],
    defense_flow=["Input Received", "Blocklist Filtering", "Content Sanitization", "Processed Output"],
    implementation=(
        "const blocklist = new Set([\n"
        "  'ignore previous',\n"
        "  'system prompt',\n"
        "  'bypass safety'\n"
        "]);\n\n"
        "function filterBlocklist(text: string): boolean {\n"
        "  return Array.from(blocklist).some(term =>\n"
        "    text.toLowerCase().includes(term)\n"
        "  );\n"
        "}"
    ),
))

_register(Mitigation(
    id="delimiter-tokens",
    name="Delimiter Tokens",
    description="Use special tokens to separate system instructions from user input",
    strategy="Implement delimiter tokens to clearly separate trusted system instructions from untrusted user input",
    metrics=[
        MetricSnapshot(label="Tests Passed", value=92),
        MetricSnapshot(label="False Positives", value=3),
        MetricSnapshot(label="False Negatives", value=5),
    ],
    defense_flow=["Input Received", "Token Injection", "Boundary Enforcement", "Safe Output"],
    implementation=(
        "const SYSTEM_DELIMITER = '<|SYSTEM|>';\n"
        "const USER_DELIMITER = '<|USER|>';\n\n"
        "function formatPrompt(system: string, user: string) {\n"
        "  return `${SYSTEM_DELIMITER}${system}${USER_DELIMITER}${user}`;\n"
        "}"
    ),
))

_register(Mitigation(
    id="output-sanitization",
    name="Output Sanitization",
    description="Sanitize model outputs to prevent data leakage and harmful content",
    strategy="Apply multi-layered sanitization to model outputs before returning to users",
    metrics=[
        MetricSnapshot(label="Tests Passed", value=90),
        MetricSnapshot(label="False Positives", value=7),
        MetricSnapshot(label="False Negatives", value=3),
    ],
    defense_flow=["Model Output", "Content Scanning", "Sensitive Data Removal", "Clean Output"],
    implementation=(
        "function sanitizeOutput(output: string): string {\n"
        "  // Remove PII patterns\n"
        "  let clean = output.replace(/\\b\\d{3}-\\d{2}-\\d{4}\\b/g, '[REDACTED]');\n"
        "  // Remove API keys\n"
        "  clean = clean.replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED]');\n"
        "  return clean;\n"
        "}"
    ),
))

_register(Mitigation(
    id="rate-limiting",
    name="Rate Limiting",
    description="Limit request frequency to prevent automated attacks",
    strategy="Implement rate limiting to prevent automated attack attempts and abuse",
    metrics=[
        MetricSnapshot(label="Tests Passed", value=85),
        MetricSnapshot(label="False Positives", value=10),
        MetricSnapshot(label="False Negatives", value=5),
    ],
    defense_flow=["Request Received", "Rate Check", "Throttle/Allow", "Process Request"],
    implementation=(
        "const rateLimiter = new Map<string, number[]>();\n\n"
        "function checkRateLimit(userId: string, limit = 10): boolean {\n"
        "  const now = Date.now();\n"
        "  const requests = rateLimiter.get(userId) || [];\n"
        "  const recent = requests.filter(t => now - t < 60000);\n"
        "  return recent.length < limit;\n"
        "}"
    ),
))

_register(Mitigation(
    id="anomaly-detection",
    name="Anomaly Detection",
    description="Detect unusual patterns and behaviors in user interactions",
    strategy="Use machine learning to identify anomalous patterns indicative of attacks",
    metrics=[
        MetricSnapshot(label="Tests Passed", value=93),
        MetricSnapshot(label="False Positives", value=4),
        MetricSnapshot(label="False Negatives", value=3),
    ],
    defense_flow=["Behavior Analysis", "Anomaly Scoring", "Threshold Check", "Action Taken"],
    implementation=(
        "function detectAnomaly(input: string): number {\n"
        "  let score = 0;\n"
        "  // Check length anomalies\n"
        "  if (input.length > 1000) score += 0.3;\n"
        "  // Check repeated phrases\n"
        "  const words = input.split(' ');\n"
        "  const uniqueRatio = new Set(words).size / words.length;\n"
        "  if (uniqueRatio < 0.5) score += 0.4;\n"
        "  return score;\n"
        "}"
    ),
))
