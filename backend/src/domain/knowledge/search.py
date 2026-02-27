"""BM25-style keyword search over the prompt-injection knowledge base.

Provides a simple but effective retrieval layer that can be swapped for
vector search later without changing its public interface.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Literal, Sequence

from domain.knowledge.vulnerabilities import VULNERABILITIES, Vulnerability
from domain.knowledge.mitigations import MITIGATIONS, Mitigation

# ---------------------------------------------------------------------------
# Public result types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SearchResult:
    """A single scored match from the knowledge base."""
    id: str
    name: str
    kind: Literal["vulnerability", "mitigation"]
    score: float
    snippet: str  # short excerpt explaining why it matched


# ---------------------------------------------------------------------------
# Tokenisation helpers
# ---------------------------------------------------------------------------

_STOP_WORDS = frozenset({
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "and", "but", "or", "if", "while", "about", "what", "which", "who",
    "this", "that", "these", "those", "it", "its", "i", "me", "my",
    "we", "our", "you", "your", "he", "him", "his", "she", "her",
    "they", "them", "their",
})

_TOKEN_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")

MIN_TOKEN_LENGTH = 2


def tokenize(text: str) -> List[str]:
    """Lowercase, split on non-alphanumeric, remove stop-words."""
    tokens = _TOKEN_RE.findall(text.lower())
    return [t for t in tokens if len(t) >= MIN_TOKEN_LENGTH and t not in _STOP_WORDS]


# ---------------------------------------------------------------------------
# Corpus building
# ---------------------------------------------------------------------------

@dataclass
class _Document:
    """Flat representation used for scoring."""
    id: str
    name: str
    kind: Literal["vulnerability", "mitigation"]
    snippet: str
    fields: Dict[str, List[str]]  # field_name -> tokens


def _build_vuln_doc(v: Vulnerability) -> _Document:
    raw_name = v.name
    raw_desc = v.description
    raw_tags = " ".join(v.tags)
    raw_nuggets = " ".join(v.nuggets)
    raw_tech = " ".join(v.technical_explanation)
    raw_attack = f"{v.example_attack.goal} {' '.join(v.example_attack.steps)}"
    raw_mitigation = v.mitigation.overview

    return _Document(
        id=v.id,
        name=v.name,
        kind="vulnerability",
        snippet=v.description,
        fields={
            "name":        tokenize(raw_name),
            "code":        tokenize(v.code),
            "tags":        tokenize(raw_tags),
            "nuggets":     tokenize(raw_nuggets),
            "description": tokenize(raw_desc),
            "technical":   tokenize(raw_tech),
            "attack":      tokenize(raw_attack),
            "mitigation":  tokenize(raw_mitigation),
        },
    )


def _build_mit_doc(m: Mitigation) -> _Document:
    return _Document(
        id=m.id,
        name=m.name,
        kind="mitigation",
        snippet=m.description,
        fields={
            "name":        tokenize(m.name),
            "description": tokenize(m.description),
            "strategy":    tokenize(m.strategy),
            "flow":        tokenize(" ".join(m.defense_flow)),
            "impl":        tokenize(m.implementation),
        },
    )


# ---------------------------------------------------------------------------
# Field weights – higher = more important when matching.
# ---------------------------------------------------------------------------

_VULN_WEIGHTS: Dict[str, float] = {
    "name":        4.0,
    "code":        3.0,
    "tags":        3.0,
    "nuggets":     2.5,
    "description": 2.0,
    "technical":   1.5,
    "attack":      1.0,
    "mitigation":  1.0,
}

_MIT_WEIGHTS: Dict[str, float] = {
    "name":        4.0,
    "description": 2.5,
    "strategy":    2.0,
    "flow":        1.5,
    "impl":        1.0,
}


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _score_document(query_tokens: List[str], doc: _Document, weights: Dict[str, float]) -> float:
    """Score a document against query tokens using weighted term frequency.

    For each query token, we add the field weight for every field that
    contains the token (counted once per field, not per occurrence, to keep
    things simple and predictable).  We then apply a mild IDF-like log
    dampening based on the number of fields that matched vs total fields.
    """
    if not query_tokens:
        return 0.0

    total = 0.0
    matched_tokens = 0

    for qt in query_tokens:
        token_score = 0.0
        for field_name, field_tokens in doc.fields.items():
            if qt in field_tokens:
                token_score += weights.get(field_name, 1.0)
        if token_score > 0:
            matched_tokens += 1
        total += token_score

    # Boost documents where a higher fraction of query tokens matched.
    if matched_tokens > 0 and len(query_tokens) > 0:
        coverage = matched_tokens / len(query_tokens)
        total *= (1.0 + coverage)

    return round(total, 2)


# ---------------------------------------------------------------------------
# Public search API
# ---------------------------------------------------------------------------

def search_knowledge_base(
    query: str,
    *,
    top_k: int = 5,
    kinds: Sequence[Literal["vulnerability", "mitigation"]] | None = None,
    min_score: float = 0.0,
) -> List[SearchResult]:
    """Search vulnerabilities and mitigations by relevance to *query*.

    Parameters
    ----------
    query:
        Natural-language search query.
    top_k:
        Maximum number of results to return.
    kinds:
        If given, restrict to ``"vulnerability"`` and/or ``"mitigation"``.
    min_score:
        Drop results with a score strictly below this threshold.

    Returns
    -------
    list[SearchResult]
        Matches sorted by descending score.
    """
    allowed = set(kinds) if kinds else {"vulnerability", "mitigation"}
    query_tokens = tokenize(query)

    if not query_tokens:
        return []

    scored: List[SearchResult] = []

    if "vulnerability" in allowed:
        for v in VULNERABILITIES.values():
            doc = _build_vuln_doc(v)
            score = _score_document(query_tokens, doc, _VULN_WEIGHTS)
            if score > min_score:
                scored.append(SearchResult(
                    id=doc.id, name=doc.name, kind="vulnerability",
                    score=score, snippet=doc.snippet,
                ))

    if "mitigation" in allowed:
        for m in MITIGATIONS.values():
            doc = _build_mit_doc(m)
            score = _score_document(query_tokens, doc, _MIT_WEIGHTS)
            if score > min_score:
                scored.append(SearchResult(
                    id=doc.id, name=doc.name, kind="mitigation",
                    score=score, snippet=doc.snippet,
                ))

    scored.sort(key=lambda r: r.score, reverse=True)
    return scored[:top_k]
