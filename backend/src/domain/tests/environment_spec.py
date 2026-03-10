from dataclasses import dataclass, field
from enum import Enum
from typing import List

from core.exceptions import InvalidModelConfiguration



class EnvType(str, Enum):
    MITIGATION = "mitigation"
    CUSTOM = "custom"


@dataclass(frozen=True)
class EnvironmentSpec:
    type: EnvType
    system_prompt: str
    mitigations: List[str] = field(default_factory=list)
    
    
    @classmethod
    def create_from_mitigations(cls, mitigations: List[str], system_prompt: str):
        return cls(
            type=EnvType.MITIGATION,
            mitigations=mitigations,
            system_prompt=system_prompt
        )
        
        
    @classmethod
    def create_from_system_prompt(cls, system_prompt: str):
        return cls(
            type=EnvType.CUSTOM,
            system_prompt=system_prompt
        )
        

    def validate(self) -> None:
        if self.type == EnvType.MITIGATION:
            if self.mitigations is None:
                raise InvalidModelConfiguration("mitigation setup requires a mitigations list")

        if self.type == EnvType.CUSTOM:
            if self.system_prompt is None:
                raise InvalidModelConfiguration("custom setup requires custom system prompt")
            if self.mitigations:
                raise InvalidModelConfiguration("custom setup cannot include mitigations")
