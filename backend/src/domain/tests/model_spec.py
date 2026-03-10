from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from core.exceptions import InvalidModelConfiguration



class ModelType(str, Enum):
    PLATFORM = "platform"
    EXTERNAL = "external"


@dataclass(frozen=True)
class ModelSpec:
    type: ModelType

    model_id: Optional[str] = None
    
    endpoint: Optional[str] = None
    conversation_mode: Optional[str] = None
    message_field: Optional[str] = None
    response_text_path: Optional[str] = None
    headers: Optional[dict[str, str]] = None
    payload: Optional[dict[str, Any]] = None
    json_schema: Optional[dict[str, Any]] = None
    
    
    @classmethod
    def create_platform(cls, model_id: Optional[str] = None):
        if not model_id:
            raise InvalidModelConfiguration("platform model spec missing model id")
        return cls(
            type=ModelType.PLATFORM,
            model_id=model_id
        )
        
        
    @classmethod
    def create_external(
        cls,
        endpoint: Optional[str] = None,
        conversation_mode: str = "single",
        message_field: str = "input",
        response_text_path: Optional[str] = None,
        headers: Optional[dict[str, str]] = None,
        payload: Optional[dict[str, Any]] = None,
        json_schema: Optional[dict[str, Any]] = None,
    ):
        if not endpoint:
            raise InvalidModelConfiguration("external model spec missing endpoint")
        return cls(
            type=ModelType.EXTERNAL,
            endpoint=endpoint,
            conversation_mode=conversation_mode,
            message_field=message_field,
            response_text_path=response_text_path,
            headers=headers,
            payload=payload,
            json_schema=json_schema,
        )


    def validate(self) -> None:
        if self.type == ModelType.PLATFORM:
            if not self.model_id:
                raise InvalidModelConfiguration("platform model requires model id")
            if any(
                value is not None
                for value in (
                    self.endpoint,
                    self.conversation_mode,
                    self.headers,
                    self.payload,
                    self.json_schema,
                )
            ):
                raise InvalidModelConfiguration("platform model cannot include custom endpoint")

        if self.type == ModelType.EXTERNAL:
            if not self.endpoint:
                raise InvalidModelConfiguration("external model requires endpoint")
            if self.model_id:
                raise InvalidModelConfiguration("external model cannot include model_id")
            if self.conversation_mode not in {"single", "multi"}:
                raise InvalidModelConfiguration("external model requires conversation_mode: 'single' or 'multi'")
            if not self.message_field:
                raise InvalidModelConfiguration("external model requires message_field")
            if self.response_text_path is not None and not isinstance(self.response_text_path, str):
                raise InvalidModelConfiguration("external model response_text_path must be a string")
            if self.headers is not None and not isinstance(self.headers, dict):
                raise InvalidModelConfiguration("external model headers must be a JSON object")
            if self.payload is not None and not isinstance(self.payload, dict):
                raise InvalidModelConfiguration("external model payload must be a JSON object")
            if self.json_schema is not None and not isinstance(self.json_schema, dict):
                raise InvalidModelConfiguration("external model json_schema must be a JSON object")