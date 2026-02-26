"""Requires API keys in .env and --run-integration flag.

Usage: pytest tests/integration/test_chat_live.py --run-integration -v
"""
from __future__ import annotations

import json
from typing import List

import pytest
from fastapi.testclient import TestClient

from api.server import create_app


def _parse_sse_events(body: str) -> List[dict]:
    events: List[dict] = []
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


@pytest.fixture(scope="module")
def client() -> TestClient:
    app = create_app()
    return TestClient(app)


@pytest.mark.integration
class TestChatLive:
    def test_basic_question(self, client: TestClient):
        response = client.post("/api/chat", json={
            "message": "What is direct prompt injection?",
            "history": [],
        })

        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        events = _parse_sse_events(response.text)
        event_types = [e["event"] for e in events]

        assert "delta" in event_types, f"No delta events. Events: {event_types}"
        assert "done" in event_types, f"No done event. Events: {event_types}"

        delta_texts = [e["data"]["text"] for e in events if e["event"] == "delta"]
        full_text = "".join(delta_texts)
        assert len(full_text) > 20, f"Answer too short: {full_text!r}"

    def test_with_history(self, client: TestClient):
        response = client.post("/api/chat", json={
            "message": "What mitigations help against it?",
            "history": [
                {"role": "user", "content": "What is direct prompt injection?"},
                {"role": "assistant", "content": "Direct prompt injection is when a user provides instructions that override the system's intended behavior."},
            ],
        })

        assert response.status_code == 200
        events = _parse_sse_events(response.text)
        assert any(e["event"] == "done" for e in events)

    def test_general_security_query(self, client: TestClient):
        response = client.post("/api/chat", json={
            "message": "Tell me about security best practices for LLM applications",
            "history": [],
        })

        assert response.status_code == 200
        events = _parse_sse_events(response.text)
        assert any(e["event"] == "done" for e in events)
