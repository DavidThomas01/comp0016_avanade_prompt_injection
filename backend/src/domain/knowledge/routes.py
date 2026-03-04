"""Maps knowledge-base entity IDs to frontend page paths.

This module is the single source of truth for the relationship between
backend KB entries and their corresponding frontend routes.  Keep it in
sync when vulnerability slugs or frontend route patterns change.
"""

from __future__ import annotations

from typing import Dict

VULNERABILITY_PATHS: Dict[str, str] = {
    "pi-v1": "/vulnerability/direct-prompt-injection",
    "pi-v2": "/vulnerability/indirect-prompt-injection",
    "pi-v3": "/vulnerability/instruction-data-boundary-confusion",
    "pi-v4": "/vulnerability/obfuscation-encoding-attacks",
    "pi-v5": "/vulnerability/tool-use-action-injection",
    "pi-v6": "/vulnerability/memory-long-horizon-vulnerabilities",
    "pi-v7": "/vulnerability/multimodal-prompt-injection",
    "pi-v8": "/vulnerability/multi-agent-workflow-contamination",
}
