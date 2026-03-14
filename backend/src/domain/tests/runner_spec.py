from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List
from domain.providers.base_provider import Message

from core.exceptions import InvalidModelConfiguration

class RunnerType(str, Enum):
    PROMPT = "prompt"
    FRAMEWORK = "framework"


@dataclass
class RunnerSpec:
    type: RunnerType

    context: List[Message] = field(default_factory=list)
    probe_spec: Optional[str] = None


    @classmethod
    def create_prompt(cls, context: Optional[List[Message]] = None):
        return cls(
            type=RunnerType.PROMPT,
            context=context or []
        )


    @classmethod
    def create_framework(cls, probe_spec: Optional[str] = None):
        return cls(
            type=RunnerType.FRAMEWORK,
            probe_spec=probe_spec,
        )
        

    def validate(self) -> None:
        if self.type == RunnerType.PROMPT:
            return

        if self.type == RunnerType.FRAMEWORK:
            if self.context:
                raise InvalidModelConfiguration("framework runner cannot include context")