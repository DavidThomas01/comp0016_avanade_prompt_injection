from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any


# ---------- Messages ----------

@dataclass
class Message:
    role: str  # "system" | "user" | "assistant"
    content: str


# ---------- Request ----------

@dataclass
class ModelRequest:
    model: str
    messages: List[Message]
    system_prompt: Optional[str] = None
    temperature: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


# ---------- Response ----------

@dataclass
class ModelResponse:
    text: str
    raw: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# ---------- Provider Interface ----------

class ModelProvider(ABC):

    @abstractmethod
    async def generate(self, request: ModelRequest) -> ModelResponse:
        """
        Execute a model call and return a response.

        Must not raise provider-specific objects.
        Should raise domain-level exceptions if needed.
        """
        pass
