# backend/src/app/chat/service.py
from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncGenerator, Dict, List, Literal

from app.chat.prompts import SYSTEM_PROMPT
from app.routers.provider_router import ProviderRouter
from domain.knowledge.search import search_knowledge_base
from domain.knowledge.vulnerabilities import VULNERABILITIES
from domain.knowledge.mitigations import MITIGATIONS
from domain.knowledge.routes import VULNERABILITY_PATHS
from domain.providers.base_provider import Message, ModelRequest
from infra.config.chat import (
    CHUNK_SIZE,
    DEFAULT_MODEL,
    MAX_HISTORY_MESSAGES,
    MAX_TOKENS,
)


@dataclass
class SSEDeltaEvent:
    event: Literal["delta"] = "delta"
    text: str = ""


@dataclass
class SSEDoneEvent:
    event: Literal["done"] = "done"


SSEEvent = SSEDeltaEvent | SSEDoneEvent


def _trim_history(history: List[Dict[str, str]], max_messages: int) -> List[Dict[str, str]]:
    if len(history) <= max_messages:
        return history
    return history[-max_messages:]


def _build_kb_context(query: str) -> str:
    results = search_knowledge_base(query, top_k=3)
    if not results:
        return ""

    sections: List[str] = []
    for r in results:
        if r.kind == "vulnerability":
            v = VULNERABILITIES.get(r.id)
            if v:
                page_path = VULNERABILITY_PATHS.get(v.id, "")
                page_line = f"**Page:** [{v.name}]({page_path})\n" if page_path else ""
                sections.append(
                    f"### {v.name}\n"
                    f"{page_line}"
                    f"{v.description}\n\n"
                    f"**Impact:** {v.impact_level}\n"
                    f"**Tags:** {', '.join(v.tags)}\n\n"
                    + "\n".join(v.technical_explanation) + "\n\n"
                    f"**Example attack:** {v.example_attack.goal}\n"
                    f"Steps: {'; '.join(v.example_attack.steps)}\n\n"
                    f"**Mitigation overview:** {v.mitigation.overview}\n"
                    f"Recommended: {', '.join(v.mitigation.recommended_mitigation_ids)}"
                )
        elif r.kind == "mitigation":
            m = MITIGATIONS.get(r.id)
            if m:
                sections.append(
                    f"### Mitigation: {m.name}\n"
                    f"**Page:** [View mitigations](/mitigations)\n"
                    f"{m.description}\n\n"
                    f"**Strategy:** {m.strategy}\n"
                    f"**Defense flow:** {' \u2192 '.join(m.defense_flow)}"
                )

    return "\n\n---\n\n".join(sections)


class ChatService:
    """Searches the KB for relevant context, injects it into the prompt,
    calls the LLM once, and streams the response as SSE events."""

    def __init__(self, router: ProviderRouter) -> None:
        self._router = router

    async def stream(
        self,
        message: str,
        history: List[Dict[str, str]] | None = None,
        model: str = DEFAULT_MODEL,
    ) -> AsyncGenerator[SSEEvent, None]:
        trimmed = _trim_history(history or [], MAX_HISTORY_MESSAGES)

        messages: List[Message] = []
        for h in trimmed:
            messages.append(Message(role=h["role"], content=h["content"]))

        kb_context = _build_kb_context(message)
        if kb_context:
            augmented = (
                f"{message}\n\n"
                f"---\n"
                f"**Relevant knowledge base context:**\n\n"
                f"{kb_context}"
            )
        else:
            augmented = message

        messages.append(Message(role="user", content=augmented))

        request = ModelRequest(
            model=model,
            messages=messages,
            system_prompt=SYSTEM_PROMPT,
            metadata={"max_completion_tokens": MAX_TOKENS},
        )

        try:
            response = await self._router.generate(request)
            text = response.text

            if not text or not text.strip():
                print(f"[ChatService] WARNING: LLM returned empty response. Raw: {response.raw}")
                yield SSEDeltaEvent(text="I wasn't able to find a good answer for that. Could you try rephrasing your question?")
                yield SSEDoneEvent()
                return

            for i in range(0, len(text), CHUNK_SIZE):
                chunk = text[i : i + CHUNK_SIZE]
                if chunk:
                    yield SSEDeltaEvent(text=chunk)

            yield SSEDoneEvent()
        except Exception as exc:
            print(f"[ChatService] ERROR: {type(exc).__name__}: {exc}")
            yield SSEDeltaEvent(text=f"Sorry, something went wrong: {exc}")
            yield SSEDoneEvent()
