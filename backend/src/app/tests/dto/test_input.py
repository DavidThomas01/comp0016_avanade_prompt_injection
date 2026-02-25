from domain.tests import *
from domain.providers import Message
from typing import Optional, Any, List
from dataclasses import dataclass, field


@dataclass
class ModelSpecInput:
    type: ModelType
    model_id: Optional[str] = None
    endpoint: Optional[str] = None
    key: Optional[str] = None


@dataclass
class EnvironmentSpecInput:
    type: EnvType
    system_prompt: str
    mitigations: List[str] = field(default_factory=list)


@dataclass
class RunnerSpecInput:
    type: RunnerType
    context: Optional[List[Message]] = None


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
    
    
@dataclass
class RunTestInput:
    prompt: str