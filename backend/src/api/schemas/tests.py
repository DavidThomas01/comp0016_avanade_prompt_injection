from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any

from domain.tests import *
from domain.providers import *
from app.tests.dto import *


class ModelSpecSchema(BaseModel):
    type: ModelType
    model_id: Optional[str] = None
    endpoint: Optional[str] = None
    conversation_mode: Optional[str] = None
    message_field: Optional[str] = None
    response_text_path: Optional[str] = None
    headers: Optional[dict[str, str]] = None
    payload: Optional[dict[str, Any]] = None
    json_schema: Optional[dict[str, Any]] = None
    
    def to_dto(self) -> ModelSpecInput:
        return ModelSpecInput(
            type=self.type,
            model_id=self.model_id,
            endpoint=self.endpoint,
            conversation_mode=self.conversation_mode,
            message_field=self.message_field,
            response_text_path=self.response_text_path,
            headers=self.headers,
            payload=self.payload,
            json_schema=self.json_schema,
        )


class ValidateExternalModelRequest(BaseModel):
    model: ModelSpecSchema
    prompt: str = "Connection check"

    def to_dto(self) -> tuple[ModelSpecInput, str]:
        return self.model.to_dto(), self.prompt


class ValidateExternalModelResponse(BaseModel):
    output: str
    raw: Any


class EnvironmentSpecSchema(BaseModel):
    type: EnvType
    system_prompt: str
    mitigations: List[str] = Field(default_factory=list)
    
    def to_dto(self) -> EnvironmentSpecInput:
        return EnvironmentSpecInput(
            type=self.type,
            system_prompt=self.system_prompt,
            mitigations=list(self.mitigations)
        )


class RunnerSpecSchema(BaseModel):
    type: RunnerType
    context: List[Message] = Field(default_factory=list)
    probe_spec: Optional[str] = None

    def to_dto(self) -> RunnerSpecInput:
        return RunnerSpecInput(
            type=self.type,
            context=list(self.context) if self.context else None,
            probe_spec=self.probe_spec,
        )
        

class CreateTestRequest(BaseModel):
    name: str
    model: ModelSpecSchema
    environment: Optional[EnvironmentSpecSchema] = None
    runner: RunnerSpecSchema
    
    def to_dto(self) -> CreateTestInput:
        return CreateTestInput(
            name=self.name,
            model=self.model.to_dto(),
            environment=self.environment.to_dto() if self.environment else None,
            runner=self.runner.to_dto(),
        )
    
    
class UpdateTestRequest(BaseModel):
    name: Optional[str] = None
    model: Optional[ModelSpecSchema] = None
    environment: Optional[EnvironmentSpecSchema] = None
    runner: Optional[RunnerSpecSchema] = None
    
    def to_dto(self) -> UpdateTestInput:
        return UpdateTestInput(
            name=self.name,
            model=self.model.to_dto() if self.model else None,
            environment=self.environment.to_dto() if self.environment else None,
            runner=self.runner.to_dto() if self.runner else None,
        )
    

class TestAnalysisSchema(BaseModel):
    flagged: bool
    score: float
    reason: str

    
class RunTestRequest(BaseModel):
    role: str
    content: str
    
    def to_dto(self) -> Message:
        return Message(
            role=self.role,
            content=self.content
        )
    

class AttemptResult(BaseModel):
    prompt: str
    output: Optional[str] = None
    blocked: bool
    statuses: List[int] = Field(default_factory=list)
    goal: Optional[str] = None
    compromised: bool = False


class RunTestReponse(BaseModel):
    output: str
    analysis: TestAnalysisSchema
    started_at: datetime
    finished_at: datetime
    report_html_url: Optional[str] = None
    attempts: Optional[List[AttemptResult]] = None