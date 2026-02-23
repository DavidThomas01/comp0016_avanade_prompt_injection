from dataclasses import dataclass, field
from typing import Any, Optional
from abc import ABC, abstractmethod
from enum import Enum
from domain.providers import Message


class MitigationLayer(Enum):
    PROMPT = "prompt"
    PRE_INPUT = "pre_input"
    POST_OUTPUT = "post_output"
    INFRASTRUCTURE = "infrastructure"
    MONITORING = "monitoring"
    
    
@dataclass
class MitigationAnalysis:
    flagged: bool
    score: float
    reason: str


@dataclass
class MitigationContext:
    message: Message
    context: list[Message]
    metadata: dict[str, Any] = field(default_factory=dict)
    raw: Optional[Any] = None
    analysis: Optional[MitigationAnalysis] = None


class Mitigation(ABC):
    
    layer: MitigationLayer
    
    @abstractmethod
    def apply(context: MitigationContext) -> MitigationContext:
        pass
    

@dataclass(frozen=True)
class MitigationConfig:
    id: str
    name: str
    layer: MitigationLayer
    prompt_message: str | None
    implementation: Mitigation | None