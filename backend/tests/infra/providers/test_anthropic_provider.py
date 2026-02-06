import asyncio

import pytest

from infra.providers.anthropic_provider import AnthropicProvider
from domain.providers.base_provider import ModelRequest, Message


class DummyResponse:
	def __init__(self, status_code: int = 200, payload: dict | None = None, text: str = "") -> None:
		self.status_code = status_code
		self._payload = payload or {}
		self.text = text

	def json(self) -> dict:
		return self._payload


class DummyAsyncClient:
	last_request: dict | None = None
	next_response: DummyResponse = DummyResponse()

	def __init__(self, *args, **kwargs) -> None:
		self.timeout = kwargs.get("timeout")

	async def __aenter__(self):
		return self

	async def __aexit__(self, exc_type, exc, tb):
		return False

	async def post(self, url: str, json: dict | None = None, headers: dict | None = None):
		DummyAsyncClient.last_request = {"url": url, "json": json, "headers": headers}
		return DummyAsyncClient.next_response


def run(coro):
	return asyncio.run(coro)


def test_generate_payload_with_system_prompt(monkeypatch):
	monkeypatch.setenv("FOUNDRY_CLAUDE_KEY", "test-key")
	DummyAsyncClient.next_response = DummyResponse(
		payload={"content": [{"type": "text", "text": "ok"}]}
	)

	import infra.providers.anthropic_provider as provider_module

	monkeypatch.setattr(provider_module.httpx, "AsyncClient", DummyAsyncClient)

	provider = AnthropicProvider()
	request = ModelRequest(
		model="claude",
		messages=[Message(role="user", content="hello")],
		system_prompt="system-msg",
		temperature=0.3,
		metadata={"max_tokens": 77},
	)

	result = run(provider.generate(request))

	assert result.text == "ok"
	assert DummyAsyncClient.last_request is not None

	payload = DummyAsyncClient.last_request["json"]
	headers = DummyAsyncClient.last_request["headers"]

	assert payload["model"] == "claude-sonnet-4-5"
	assert payload["system"] == "system-msg"
	assert payload["temperature"] == 0.3
	assert payload["max_tokens"] == 77
	assert payload["messages"][0]["role"] == "user"
	assert headers["x-api-key"] == "test-key"


def test_missing_model_raises():
	provider = AnthropicProvider()
	request = ModelRequest(model="unknown", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="Unknown model"):
		run(provider.generate(request))


def test_provider_mismatch_raises():
	provider = AnthropicProvider()
	request = ModelRequest(model="gpt-5.2", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="not an anthropic model"):
		run(provider.generate(request))


def test_missing_api_key_raises(monkeypatch):
	monkeypatch.delenv("FOUNDRY_CLAUDE_KEY", raising=False)
	provider = AnthropicProvider()
	request = ModelRequest(model="claude", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="Missing API key"):
		run(provider.generate(request))


def test_http_error_raises(monkeypatch):
	monkeypatch.setenv("FOUNDRY_CLAUDE_KEY", "test-key")
	DummyAsyncClient.next_response = DummyResponse(status_code=429, text="rate limit")

	import infra.providers.anthropic_provider as provider_module

	monkeypatch.setattr(provider_module.httpx, "AsyncClient", DummyAsyncClient)

	provider = AnthropicProvider()
	request = ModelRequest(model="claude", messages=[Message(role="user", content="hi")])

	with pytest.raises(RuntimeError, match="Anthropic provider error"):
		run(provider.generate(request))


def test_extract_text_from_content_blocks():
	provider = AnthropicProvider()
	data = {"content": [{"type": "text", "text": "block-text"}]}

	assert provider._extract_text(data) == "block-text"
