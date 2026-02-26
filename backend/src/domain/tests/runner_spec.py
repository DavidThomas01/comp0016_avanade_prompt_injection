from dataclasses import dataclass
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

    context: Optional[List[Message]] = None
    
    
    @classmethod
    def create_prompt(cls, context: Optional[List[Message]] = None):
        return cls(
            type=RunnerType.PROMPT,
            context=context or []
        )
    
    
    @classmethod
    def create_framework(cls):
        return cls(
            type=RunnerType.FRAMEWORK,
        )
        

    def validate(self) -> None:
        if self.type == RunnerType.PROMPT:
            return

        if self.type == RunnerType.FRAMEWORK:
            if self.context:
                raise InvalidModelConfiguration("framework runner cannot include context")