# backend/src/api/schemas/chat.py
from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from infra.config.chat import DEFAULT_MODEL


class ChatMessageSchema(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The new user message.")
    history: List[ChatMessageSchema] = Field(
        default_factory=list,
        description="Previous conversation turns.",
    )
    model: str = Field(
        default=DEFAULT_MODEL,
        description="Model name from the model registry.",
    )
