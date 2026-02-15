from dataclasses import dataclass
from typing import Literal, Optional

ModelType = Literal["platform", "external"]

@dataclass(frozen=True)
class ModelSpec:
    type: ModelType
    model_id: Optional[str] = None
    endpoint: Optional[str] = None
    auth_token: Optional[str] = None

    def validate(self) -> None:
        if self.type == "platform" and not self.model_id:
            raise ValueError("platform model requires model_id")

        if self.type == "external" and not self.endpoint:
            raise ValueError("external model requires endpoint")
