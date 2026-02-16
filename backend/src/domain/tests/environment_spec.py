from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class EnvType(Enum):
    MITIGATION = "mitigation"
    CUSTOM = "custom"


@dataclass(frozen=True)
class EnvironmentSpec:
    type: EnvType
    mitigations: Optional[List[str]] = None
    system_prompt: str
    
    
    @classmethod
    def create_from_mitigations(cls, mitigations: dict, system_prompt: str):
        return cls(
            type=EnvType.MITIGATION,
            mitigations=mitigations,
            system_prompt=system_prompt
        )
        
        
    @classmethod
    def create_from_prompt(cls, system_prompt: str):
        return cls(
            type=EnvType.CUSTOM,
            system_prompt=system_prompt
        )
        

    def validate(self) -> None:
        if self.type == EnvType.MITIGATION:
            if not self.mitigations:
                raise ValueError("mitigation setup requires a mitigations list")

        if self.type == EnvType.CUSTOM:
            if not self.system_prompt:
                raise ValueError("custom setup requires custom system prompt")
            if self.mitigations:
                raise ValueError("custom setup cannot include mitigations")
