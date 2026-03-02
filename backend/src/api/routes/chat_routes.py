# backend/src/api/routes/chat.py
from __future__ import annotations

import json
from dataclasses import asdict
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from api.deps import get_provider_router
from api.schemas.chat import ChatRequest
from app.chat.chat_service import ChatService, SSEEvent, SSEDeltaEvent, SSEDoneEvent
from app.routers.provider_router import ProviderRouter

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _format_sse(event: SSEEvent) -> str:
    data = asdict(event)
    event_type = data.pop("event")
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


async def _event_generator(
    service: ChatService,
    request: ChatRequest,
) -> AsyncGenerator[str, None]:
    history = [{"role": m.role, "content": m.content} for m in request.history]
    try:
        async for event in service.stream(
            message=request.message,
            history=history,
            model=request.model,
        ):
            yield _format_sse(event)
    except Exception as exc:
        print(f"[SSE generator] ERROR: {type(exc).__name__}: {exc}")
        yield _format_sse(SSEDeltaEvent(text=f"Sorry, something went wrong: {exc}"))
        yield _format_sse(SSEDoneEvent())


@router.post("")
async def chat(
    payload: ChatRequest,
    router_dep: ProviderRouter = Depends(get_provider_router),
) -> StreamingResponse:
    service = ChatService(router=router_dep)
    return StreamingResponse(
        _event_generator(service, payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
