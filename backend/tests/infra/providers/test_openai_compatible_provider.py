import asyncio
import pytest

from infra.providers.openai_compatible_provider import OpenAICompatibleProvider
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


def test_generate_payload(monkeypatch):
	monkeypatch.setenv("FOUNDRY_LLAMA_KEY", "test-key")
	DummyAsyncClient.next_response = DummyResponse(
		payload={"choices": [{"message": {"content": "ok"}}]}
	)

	import infra.providers.openai_compatible_provider as provider_module

	monkeypatch.setattr(provider_module.httpx, "AsyncClient", DummyAsyncClient)

	provider = OpenAICompatibleProvider()
	request = ModelRequest(
		model="llama",
		messages=[Message(role="user", content="hello")],
		system_prompt="system-msg",
		temperature=0.1,
		metadata={"max_tokens": 12},
	)

	result = run(provider.generate(request))

	assert result.text == "ok"
	assert DummyAsyncClient.last_request is not None

	payload = DummyAsyncClient.last_request["json"]
	headers = DummyAsyncClient.last_request["headers"]

	assert payload["model"] == "Llama-3.3-70B-Instruct"
	assert payload["temperature"] == 0.1
	assert payload["messages"][0]["role"] == "system"
	assert payload["messages"][0]["content"] == "system-msg"
	assert payload["max_tokens"] == 12
	assert headers["api-key"] == "test-key"


def test_missing_model_raises():
	provider = OpenAICompatibleProvider()
	request = ModelRequest(model="unknown", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="Unknown model"):
		run(provider.generate(request))


def test_provider_mismatch_raises():
	provider = OpenAICompatibleProvider()
	request = ModelRequest(model="claude-sonnet-4-5", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="OpenAI-compatible model"):
		run(provider.generate(request))


def test_missing_api_key_raises(monkeypatch):
	monkeypatch.delenv("FOUNDRY_LLAMA_KEY", raising=False)
	provider = OpenAICompatibleProvider()
	request = ModelRequest(model="llama", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="Missing API key"):
		run(provider.generate(request))


def test_http_error_raises(monkeypatch):
	monkeypatch.setenv("FOUNDRY_LLAMA_KEY", "test-key")
	DummyAsyncClient.next_response = DummyResponse(status_code=500, text="server error")

	import infra.providers.openai_compatible_provider as provider_module

	monkeypatch.setattr(provider_module.httpx, "AsyncClient", DummyAsyncClient)

	provider = OpenAICompatibleProvider()
	request = ModelRequest(model="llama", messages=[Message(role="user", content="hi")])

	with pytest.raises(RuntimeError, match="Other models provider error"):
		run(provider.generate(request))


def test_extract_text_from_choices():
	provider = OpenAICompatibleProvider()
	data = {"choices": [{"message": {"content": "block-text"}}]}

	assert provider._extract_text(data) == "block-text"
