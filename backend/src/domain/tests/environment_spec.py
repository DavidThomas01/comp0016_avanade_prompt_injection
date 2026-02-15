from dataclasses import dataclass
from typing import Literal, List, Optional

EnvType = Literal["mitigation", "custom"]

@dataclass(frozen=True)
class EnvironmentSpec:
    type: EnvType
    mitigations: Optional[List[str]] = None
    system_prompt: Optional[str] = None

    def validate(self) -> None:
        if self.type == "mitigation":
            if not self.mitigations:
                raise ValueError("mitigation setup requires a mitigations list")
            if self.system_prompt:
                raise ValueError("mitigation setup cannot include custom system prompt")

        if self.type == "custom":
            if not self.system_prompt:
                raise ValueError("custom setup requires custom system prompt")
            if self.mitigations:
                raise ValueError("custom setup cannot include mitigations")
