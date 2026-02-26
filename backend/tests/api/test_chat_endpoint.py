from __future__ import annotations

import json
from typing import List
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from api.server import create_app
from domain.providers.base_provider import ModelResponse


def _mock_router(text: str) -> AsyncMock:
    router = AsyncMock()
    router.generate = AsyncMock(return_value=ModelResponse(text=text))
    return router


def _parse_sse_events(body: str) -> List[dict]:
    events = []
    current_event = None
    current_data = None

    for line in body.split("\n"):
        if line.startswith("event: "):
            current_event = line[len("event: "):]
        elif line.startswith("data: "):
            current_data = line[len("data: "):]
        elif line == "" and current_event is not None:
            events.append({
                "event": current_event,
                "data": json.loads(current_data) if current_data else {},
            })
            current_event = None
            current_data = None

    return events


class TestChatEndpoint:
    def test_returns_sse_content_type(self):
        mock_router = _mock_router("Hello")

        app = create_app()
        from api.deps import get_provider_router
        app.dependency_overrides[get_provider_router] = lambda: mock_router

        client = TestClient(app)
        response = client.post("/api/chat", json={"message": "Hi"})

        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

    def test_response_yields_delta_and_done(self):
        mock_router = _mock_router("Test response")

        app = create_app()
        from api.deps import get_provider_router
        app.dependency_overrides[get_provider_router] = lambda: mock_router

        client = TestClient(app)
        response = client.post("/api/chat", json={"message": "test"})

        events = _parse_sse_events(response.text)
        event_types = [e["event"] for e in events]

        assert "delta" in event_types
        assert "done" in event_types

        delta_texts = [e["data"]["text"] for e in events if e["event"] == "delta"]
        full_text = "".join(delta_texts)
        assert full_text == "Test response"

    def test_empty_message_returns_422(self):
        app = create_app()
        client = TestClient(app)
        response = client.post("/api/chat", json={"message": ""})
        assert response.status_code == 422

    def test_history_is_optional(self):
        mock_router = _mock_router("ok")

        app = create_app()
        from api.deps import get_provider_router
        app.dependency_overrides[get_provider_router] = lambda: mock_router

        client = TestClient(app)
        response = client.post("/api/chat", json={"message": "hello"})
        assert response.status_code == 200
