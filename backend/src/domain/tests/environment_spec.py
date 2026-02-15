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
                raise ValueError("mitigation env requires mitigations list")
            if self.system_prompt:
                raise ValueError("mitigation env cannot include custom system_prompt")

        if self.type == "custom":
            if not self.system_prompt:
                raise ValueError("custom env requires custom system_prompt")
            if self.mitigations:
                raise ValueError("custom env cannot include mitigations")
