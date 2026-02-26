from __future__ import annotations

from typing import List
from unittest.mock import AsyncMock

import pytest

from app.chat.service import ChatService, SSEDeltaEvent, SSEDoneEvent
from domain.providers.base_provider import ModelResponse


def _mock_router(text: str) -> AsyncMock:
    router = AsyncMock()
    router.generate = AsyncMock(return_value=ModelResponse(text=text))
    return router


async def _collect(service: ChatService, message: str, **kw) -> List:
    events = []
    async for event in service.stream(message, **kw):
        events.append(event)
    return events


class TestBasicResponse:
    @pytest.mark.asyncio
    async def test_emits_delta_and_done(self):
        service = ChatService(router=_mock_router("Hello world"))
        events = await _collect(service, "Hi")

        deltas = [e for e in events if isinstance(e, SSEDeltaEvent)]
        dones = [e for e in events if isinstance(e, SSEDoneEvent)]

        assert len(deltas) >= 1
        full_text = "".join(d.text for d in deltas)
        assert full_text == "Hello world"
        assert len(dones) == 1

    @pytest.mark.asyncio
    async def test_empty_response_gives_fallback(self):
        service = ChatService(router=_mock_router(""))
        events = await _collect(service, "Hi")

        deltas = [e for e in events if isinstance(e, SSEDeltaEvent)]
        full_text = "".join(d.text for d in deltas)
        assert len(full_text) > 0
        assert "rephras" in full_text.lower()


class TestErrorHandling:
    @pytest.mark.asyncio
    async def test_router_error_sends_message_as_delta(self):
        router = AsyncMock()
        router.generate = AsyncMock(side_effect=RuntimeError("API down"))
        service = ChatService(router=router)
        events = await _collect(service, "Hello")

        deltas = [e for e in events if isinstance(e, SSEDeltaEvent)]
        full_text = "".join(d.text for d in deltas)
        assert "API down" in full_text

        dones = [e for e in events if isinstance(e, SSEDoneEvent)]
        assert len(dones) == 1


class TestHistory:
    @pytest.mark.asyncio
    async def test_history_included_in_request(self):
        router = _mock_router("ok")
        service = ChatService(router=router)

        history = [
            {"role": "user", "content": "What is prompt injection?"},
            {"role": "assistant", "content": "It is ..."},
        ]
        await _collect(service, "Tell me more", history=history)

        call_args = router.generate.call_args
        req = call_args[0][0]
        roles = [m.role for m in req.messages]
        assert roles == ["user", "assistant", "user"]
        assert req.messages[-1].content.startswith("Tell me more")


class TestKBContext:
    @pytest.mark.asyncio
    async def test_security_query_includes_kb_context(self):
        router = _mock_router("Here is info about direct prompt injection.")
        service = ChatService(router=router)
        await _collect(service, "What is direct prompt injection?")

        call_args = router.generate.call_args
        req = call_args[0][0]
        user_msg = req.messages[-1].content
        assert "knowledge base context" in user_msg.lower() or "Direct Prompt Injection" in user_msg

    @pytest.mark.asyncio
    async def test_nonsense_query_has_no_kb_context(self):
        router = _mock_router("I don't know about xyzzy.")
        service = ChatService(router=router)
        await _collect(service, "xyzzy foobar baz")

        call_args = router.generate.call_args
        req = call_args[0][0]
        user_msg = req.messages[-1].content
        assert "knowledge base context" not in user_msg.lower()
