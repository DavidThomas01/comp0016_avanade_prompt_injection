from dataclasses import dataclass
from enum import Enum
from typing import Optional

from core.exceptions import InvalidModelConfiguration



class ModelType(str, Enum):
    PLATFORM = "platform"
    EXTERNAL = "external"


@dataclass(frozen=True)
class ModelSpec:
    type: ModelType

    model_id: Optional[str] = None
    
    endpoint: Optional[str] = None
    key: Optional[str] = None
    
    
    @classmethod
    def create_from_registry(cls, model_id: str):
        return cls(
            type=ModelType.PLATFORM,
            model_id=model_id
        )
        
        
    @classmethod
    def create_from_external(cls, model_config: dict):
        return cls(
            type=ModelType.EXTERNAL,
            endpoint=model_config["endpoint"],
            key=model_config["key"]
        )


    def validate(self) -> None:
        if self.type == ModelType.PLATFORM:
            if not self.model_id:
                raise InvalidModelConfiguration("platform model requires model id")
            if self.endpoint or self.key:
                raise InvalidModelConfiguration("platform model cannot include custom endpoint or key")

        if self.type == ModelType.EXTERNAL:
            if not self.endpoint or not self.key:
                raise InvalidModelConfiguration("external model requires endpoint and key")
            if self.model_id:
                raise InvalidModelConfiguration("external model cannot include model id")