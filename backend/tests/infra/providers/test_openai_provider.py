import asyncio

import pytest

from infra.providers.openai_provider import OpenAIProvider
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


def test_generate_responses_endpoint_payload(monkeypatch):
	monkeypatch.setenv("FOUNDRY_GPT52_KEY", "test-key")
	DummyAsyncClient.next_response = DummyResponse(payload={"output_text": "ok"})

	import infra.providers.openai_provider as provider_module

	monkeypatch.setattr(provider_module.httpx, "AsyncClient", DummyAsyncClient)

	provider = OpenAIProvider()
	request = ModelRequest(
		model="gpt-5.2",
		messages=[Message(role="user", content="hello")],
		system_prompt="system-msg",
		temperature=0.2,
		metadata={"max_output_tokens": 10},
	)

	result = run(provider.generate(request))

	assert result.text == "ok"
	assert DummyAsyncClient.last_request is not None

	payload = DummyAsyncClient.last_request["json"]
	headers = DummyAsyncClient.last_request["headers"]

	assert "input" in payload
	assert "messages" not in payload
	assert payload["model"] == "gpt-5.2"
	assert payload["temperature"] == 0.2
	assert payload["max_output_tokens"] == 10
	assert payload["input"][0]["role"] == "system"
	assert payload["input"][0]["content"] == "system-msg"
	assert headers["api-key"] == "test-key"


def test_generate_chat_completions_payload(monkeypatch):
	monkeypatch.setenv("FOUNDRY_O4NANO_KEY", "test-key")
	DummyAsyncClient.next_response = DummyResponse(
		payload={"choices": [{"message": {"content": "hello"}}]}
	)

	import infra.providers.openai_provider as provider_module

	monkeypatch.setattr(provider_module.httpx, "AsyncClient", DummyAsyncClient)

	provider = OpenAIProvider()
	request = ModelRequest(
		model="o4-nano",
		messages=[Message(role="user", content="hello")],
		temperature=0.0,
	)

	result = run(provider.generate(request))

	assert result.text == "hello"
	assert DummyAsyncClient.last_request is not None

	payload = DummyAsyncClient.last_request["json"]
	assert "messages" in payload
	assert "input" not in payload


def test_missing_model_raises():
	provider = OpenAIProvider()
	request = ModelRequest(model="unknown", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="Unknown model"):
		run(provider.generate(request))


def test_missing_api_key_raises(monkeypatch):
	monkeypatch.delenv("FOUNDRY_GPT52_KEY", raising=False)
	provider = OpenAIProvider()
	request = ModelRequest(model="gpt-5.2", messages=[Message(role="user", content="hi")])

	with pytest.raises(ValueError, match="Missing API key"):
		run(provider.generate(request))


def test_http_error_raises(monkeypatch):
	monkeypatch.setenv("FOUNDRY_GPT52_KEY", "test-key")
	DummyAsyncClient.next_response = DummyResponse(status_code=400, text="bad request")

	import infra.providers.openai_provider as provider_module

	monkeypatch.setattr(provider_module.httpx, "AsyncClient", DummyAsyncClient)

	provider = OpenAIProvider()
	request = ModelRequest(model="gpt-5.2", messages=[Message(role="user", content="hi")])

	with pytest.raises(RuntimeError, match="OpenAI provider error"):
		run(provider.generate(request))


def test_extract_text_from_output_blocks():
	provider = OpenAIProvider()
	data = {
		"output": [
			{
				"content": [
					{"type": "output_text", "text": "block-text"}
				]
			}
		]
	}

	assert provider._extract_text(data) == "block-text"