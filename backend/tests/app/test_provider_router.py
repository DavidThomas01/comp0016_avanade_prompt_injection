# backend/tests/app/test_provider_router.py
import asyncio
import pytest

import app.provider_router as router_module
from app.provider_router import ProviderRouter
from domain.providers.base_provider import ModelRequest, Message, ModelResponse


class DummyProvider:
    async def generate(self, request: ModelRequest) -> ModelResponse:
        return ModelResponse(text="ok")


def run(coro):
    return asyncio.run(coro)


def test_generate_routes_to_provider(monkeypatch):
    captured = {}

    def fake_get_provider(name: str):
        captured["name"] = name
        return DummyProvider()

    monkeypatch.setattr(router_module, "get_provider", fake_get_provider)

    router = ProviderRouter()
    request = ModelRequest(model="gpt-5.2", messages=[Message(role="user", content="hi")])

    result = run(router.generate(request))

    assert result.text == "ok"
    assert captured["name"] == "openai"


def test_unknown_model_raises():
    router = ProviderRouter()
    request = ModelRequest(model="missing", messages=[Message(role="user", content="hi")])

    with pytest.raises(ValueError, match="Unknown model"):
        run(router.generate(request))


def test_provider_error_propagates(monkeypatch):
    def fake_get_provider(name: str):
        raise ValueError("Unknown provider 'nope'")

    
    monkeypatch.setattr(router_module, "get_provider", fake_get_provider)

    router = ProviderRouter()
    request = ModelRequest(model="gpt-5.2", messages=[Message(role="user", content="hi")])

    with pytest.raises(ValueError, match="Unknown provider"):
        run(router.generate(request))
