from domain.tests import *
from domain.providers import Message
from typing import Optional, Any, List
from dataclasses import dataclass, field


@dataclass
class ModelSpecInput:
    type: ModelType
    model_id: Optional[str] = None
    endpoint: Optional[str] = None
    conversation_mode: Optional[str] = None
    message_field: Optional[str] = None
    response_text_path: Optional[str] = None
    headers: Optional[dict[str, str]] = None
    payload: Optional[dict[str, Any]] = None
    json_schema: Optional[dict[str, Any]] = None


@dataclass
class EnvironmentSpecInput:
    type: EnvType
    system_prompt: str
    mitigations: List[str] = field(default_factory=list)


@dataclass
class RunnerSpecInput:
    type: RunnerType
    context: List[Message] = field(default_factory=list)
    probe_spec: Optional[str] = None


@dataclass
class CreateTestInput:
    name: str
    model: ModelSpecInput
    runner: RunnerSpecInput
    environment: Optional[EnvironmentSpecInput] = None
    
    
@dataclass
class UpdateTestInput:
    name: Optional[str] = None
    model: Optional[ModelSpecInput] = None
    environment: Optional[EnvironmentSpecInput] = None
    runner: Optional[RunnerSpecInput] = None