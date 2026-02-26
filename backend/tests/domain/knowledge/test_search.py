"""Tests for domain.knowledge.search – KB retrieval scoring and ranking."""

import pytest

from domain.knowledge.search import search_knowledge_base, tokenize, SearchResult


# ---------------------------------------------------------------------------
# tokenize()
# ---------------------------------------------------------------------------

class TestTokenize:
    def test_lowercases(self):
        assert "hello" in tokenize("Hello WORLD")

    def test_removes_stop_words(self):
        tokens = tokenize("what is the best mitigation for this")
        assert "the" not in tokens
        assert "mitigation" in tokens

    def test_removes_short_tokens(self):
        tokens = tokenize("a I x y z")
        # single-char tokens are removed (< MIN_TOKEN_LENGTH)
        assert tokens == []

    def test_removes_stop_words_comprehensive(self):
        tokens = tokenize("do it go the")
        # "do", "it", "the" are stop-words; "go" is 2+ chars and NOT a stop-word
        assert tokens == ["go"]

    def test_keeps_hyphenated_tokens(self):
        tokens = tokenize("multi-agent workflow")
        assert "multi-agent" in tokens

    def test_strips_punctuation(self):
        tokens = tokenize("injection? attacks! (tools)")
        assert "injection" in tokens
        assert "attacks" in tokens
        assert "tools" in tokens


# ---------------------------------------------------------------------------
# search_knowledge_base() – basic behaviour
# ---------------------------------------------------------------------------

class TestSearchBasic:
    def test_empty_query_returns_nothing(self):
        assert search_knowledge_base("") == []

    def test_stopword_only_query_returns_nothing(self):
        assert search_knowledge_base("the is a of") == []

    def test_returns_search_result_dataclass(self):
        results = search_knowledge_base("prompt injection")
        assert len(results) > 0
        r = results[0]
        assert isinstance(r, SearchResult)
        assert r.kind in ("vulnerability", "mitigation")
        assert r.score > 0
        assert len(r.snippet) > 0

    def test_results_sorted_by_score_descending(self):
        results = search_knowledge_base("injection", top_k=10)
        scores = [r.score for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_top_k_limits_results(self):
        results = search_knowledge_base("injection", top_k=2)
        assert len(results) <= 2


# ---------------------------------------------------------------------------
# search_knowledge_base() – relevance quality
# ---------------------------------------------------------------------------

class TestSearchRelevance:
    def test_direct_injection_query(self):
        results = search_knowledge_base("direct prompt injection")
        ids = [r.id for r in results]
        assert "pi-v1" in ids, "PI-V1 (Direct Prompt Injection) should match"

    def test_indirect_injection_query(self):
        results = search_knowledge_base("indirect prompt injection RAG retrieval")
        ids = [r.id for r in results]
        assert "pi-v2" in ids, "PI-V2 (Indirect Prompt Injection) should match"

    def test_tool_use_query(self):
        results = search_knowledge_base("tool use action agent injection")
        ids = [r.id for r in results]
        assert "pi-v5" in ids, "PI-V5 (Tool-Use Injection) should match"

    def test_multimodal_query(self):
        results = search_knowledge_base("image OCR multimodal injection")
        ids = [r.id for r in results]
        assert "pi-v7" in ids, "PI-V7 (Multimodal) should match"

    def test_multi_agent_query(self):
        results = search_knowledge_base("multi-agent workflow contamination")
        ids = [r.id for r in results]
        assert "pi-v8" in ids, "PI-V8 (Multi-Agent) should match"

    def test_obfuscation_query(self):
        results = search_knowledge_base("base64 encoding obfuscation bypass")
        ids = [r.id for r in results]
        assert "pi-v4" in ids, "PI-V4 (Obfuscation) should match"

    def test_memory_query(self):
        results = search_knowledge_base("memory long-horizon stateful attack")
        ids = [r.id for r in results]
        assert "pi-v6" in ids, "PI-V6 (Memory) should match"

    def test_mitigation_query(self):
        results = search_knowledge_base("rate limiting automated attacks")
        ids = [r.id for r in results]
        assert "rate-limiting" in ids

    def test_delimiter_tokens_query(self):
        results = search_knowledge_base("delimiter tokens boundary separation")
        ids = [r.id for r in results]
        assert "delimiter-tokens" in ids

    def test_anomaly_detection_query(self):
        results = search_knowledge_base("anomaly detection unusual patterns")
        ids = [r.id for r in results]
        assert "anomaly-detection" in ids


# ---------------------------------------------------------------------------
# search_knowledge_base() – filtering
# ---------------------------------------------------------------------------

class TestSearchFiltering:
    def test_filter_vulnerabilities_only(self):
        results = search_knowledge_base("injection", kinds=["vulnerability"])
        assert all(r.kind == "vulnerability" for r in results)

    def test_filter_mitigations_only(self):
        results = search_knowledge_base("detection filtering", kinds=["mitigation"])
        assert all(r.kind == "mitigation" for r in results)

    def test_min_score_filters_low_matches(self):
        all_results = search_knowledge_base("injection", top_k=20, min_score=0.0)
        filtered = search_knowledge_base("injection", top_k=20, min_score=5.0)
        assert len(filtered) <= len(all_results)
        assert all(r.score >= 5.0 for r in filtered)
