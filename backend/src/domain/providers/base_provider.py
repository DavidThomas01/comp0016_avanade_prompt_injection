from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from .message import Message
from .model_response import ModelResponse


@dataclass
class ModelRequest:
    model: str
    messages: List[Message]
    system_prompt: Optional[str] = None
    temperature: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class ModelProvider(ABC):

    @abstractmethod
    async def generate(self, request: ModelRequest) -> ModelResponse:
        """
        Execute a model call and return a response.

        Must not raise provider-specific objects.
        Should raise domain-level exceptions if needed.
        """
        pass
