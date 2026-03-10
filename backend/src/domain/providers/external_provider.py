from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, List, Optional
from .message import Message
from .model_response import ModelResponse


@dataclass
class ExternalModelRequest:
    endpoint: str
    messages: List[Message]
    conversation_mode: str
    message_field: str
    response_text_path: Optional[str] = None
    headers: Optional[dict[str, str]] = None
    payload: Optional[dict[str, Any]] = None
    json_schema: Optional[dict[str, Any]] = None


class ExternalModelProvider(ABC):

    @abstractmethod
    async def generate(self, request: ExternalModelRequest) -> ModelResponse:
        """
        Execute a model call and return a response.

        Must not raise provider-specific objects.
        Should raise domain-level exceptions if needed.
        """
        pass
