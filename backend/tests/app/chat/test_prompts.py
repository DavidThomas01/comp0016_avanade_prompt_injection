from app.chat.prompts import SYSTEM_PROMPT


class TestSystemPrompt:
    def test_contains_role_description(self):
        assert "Security Knowledge Assistant" in SYSTEM_PROMPT

    def test_mentions_knowledge_base(self):
        assert "knowledge base" in SYSTEM_PROMPT.lower()

    def test_mentions_vulnerabilities(self):
        assert "vulnerability" in SYSTEM_PROMPT.lower()

    def test_asks_for_markdown(self):
        assert "markdown" in SYSTEM_PROMPT.lower()

    def test_prompt_is_not_excessively_long(self):
        word_count = len(SYSTEM_PROMPT.split())
        assert word_count < 500, f"System prompt is {word_count} words"
