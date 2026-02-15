from dataclasses import dataclass
from typing import Literal, Optional, List
from domain.providers.base_provider import Message

RunnerType = Literal["single", "framework"]

@dataclass(frozen=True)
class RunnerSpec:
    type: RunnerType

    # Only used for single prompt runs
    context: Optional[List[Message]] = None

    def validate(self) -> None:
        if self.type == "single":
            return

        if self.type == "framework":
            if self.context:
                raise ValueError("framework runner cannot include context")
