from dataclasses import dataclass
from typing import Literal, Optional

ModelType = Literal["platform", "external"]

@dataclass(frozen=True)
class ModelSpec:
    type: ModelType

    model_id: Optional[str] = None
    
    endpoint: Optional[str] = None
    key: Optional[str] = None
    

    def validate(self) -> None:
        if self.type == "platform":
            if not self.model_id:
                raise ValueError("platform model requires model id")
            if self.endpoint or self.key:
                raise ValueError("platform model cannot include custom endpoint or key")

        if self.type == "external":
            if not self.endpoint or not self.key:
                raise ValueError("external model requires endpoint and key")
            if self.model_id:
                raise ValueError("external model cannot include model id")