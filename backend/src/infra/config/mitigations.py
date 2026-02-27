from __future__ import annotations

from typing import Dict


# Static mitigation templates (versioned, reviewed, immutable)
MITIGATION_REGISTRY: Dict[str, str] = {
    "input-validation": (
        "Input Validation"
    ),
    "pattern-matching": (
        "Pattern Matching"
    ),
    "blocklist-filtering": (
        "Blocklist Filtering"
    ),
    "delimiter-tokens": (
        "Delimiter Tokens"
    ),
    "output-sanitization": (
        "Output Sanitization"
    ),
    "rate-limiting": (
        "Rate Limiting"
    ),
    "anomaly-detection": (
        "Anomaly Detection"
    ),
}
