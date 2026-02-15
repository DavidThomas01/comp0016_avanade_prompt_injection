from dataclasses import dataclass
from typing import Literal, Optional, List
from domain.providers.base_provider import Message

RunnerType = Literal["single", "framework"]

@dataclass(frozen=True)
class RunnerSpec:
    type: RunnerType

    # Only used for single prompt runs
    context: Optional[List[Message]] = None

    # Only used for framework runs
    dataset: Optional[str] = None

    def validate(self) -> None:
        if self.type == "single":
            # context is optional
            return

        if self.type == "framework":
            if not self.dataset:
                raise ValueError("framework runner requires dataset")
