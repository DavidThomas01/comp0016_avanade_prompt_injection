from dataclasses import dataclass
from enum import Enum
from typing import Optional, List
from domain.providers.base_provider import Message

class RunnerType(str, Enum):
    PROMPT = "prompt"
    FRAMEWORK = "framework"

@dataclass
class RunnerSpec:
    type: RunnerType

    context: Optional[List[Message]] = None
    
    
    @classmethod
    def create_default(cls, runner_type):
        if runner_type == RunnerType.PROMPT:
            return cls(type=runner_type, context=[])
        return cls(
            type=runner_type
        )
    
    
    @classmethod
    def create_prompt(cls, context):
        return cls(
            type=RunnerType.PROMPT,
            context=context if context is not None else []
        )
        

    def validate(self) -> None:
        if self.type == RunnerType.PROMPT:
            return

        if self.type == RunnerType.FRAMEWORK:
            if self.context:
                raise ValueError("framework runner cannot include context")