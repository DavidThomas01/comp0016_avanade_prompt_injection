from __future__ import annotations

from typing import Dict


# Static mitigation templates (versioned, reviewed, immutable)
MITIGATION_REGISTRY: Dict[str, str] = {
    "input-validation": (
        "Input Validation: Implement multi-layer input validation with pattern detection "
        "and semantic analysis to detect and reject malicious inputs before processing."
    ),
    "pattern-matching": (
        "Pattern Matching: Use signature-based detection of known attack patterns and "
        "malicious input sequences to identify attempted prompt injections."
    ),
    "blocklist-filtering": (
        "Blocklist Filtering: Filter requests based on a comprehensive blocklist of known "
        "malicious phrases and keywords before processing user inputs."
    ),
    "delimiter-tokens": (
        "Delimiter Tokens: Use special tokens to clearly separate trusted system instructions "
        "from untrusted user input, preventing confusion between the two."
    ),
    "output-sanitization": (
        "Output Sanitization: Apply multi-layered sanitization to model outputs to prevent "
        "data leakage and remove sensitive information before returning to users."
    ),
    "rate-limiting": (
        "Rate Limiting: Implement rate limiting to prevent automated attack attempts and "
        "restrict the frequency of requests from individual users or IPs."
    ),
    "anomaly-detection": (
        "Anomaly Detection: Use machine learning to identify anomalous patterns and unusual "
        "behaviors in user interactions that may indicate attack attempts."
    ),
}
