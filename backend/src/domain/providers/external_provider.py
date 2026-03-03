from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List
from .message import Message
from .model_response import ModelResponse


@dataclass
class ExternalModelRequest:
    endpoint: str
    key: str
    messages: List[Message]


class ExternalModelProvider(ABC):

    @abstractmethod
    async def generate(self, request: ExternalModelRequest) -> ModelResponse:
        """
        Execute a model call and return a response.

        Must not raise provider-specific objects.
        Should raise domain-level exceptions if needed.
        """
        pass
