from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List, Any

from infra.persistance.db import SessionLocal

from app.tests import TestService

from domain.tests import *
from domain.providers import Message

from core.exceptions import *

from app.tests.dto import *


router = APIRouter(prefix="/api/tests", tags=["tests"])

class ModelSpecSchema(BaseModel):
    type: ModelType
    model_id: Optional[str] = None
    endpoint: Optional[str] = None
    key: Optional[str] = None
    
    def to_dto(self) -> ModelSpecInput:
        return ModelSpecInput(
            type=self.type,
            model_id=self.model_id,
            endpoint=self.endpoint,
            key=self.key,
        )


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
    context: Optional[List[Message]] = None
    
    def to_dto(self) -> RunnerSpecInput:
        return RunnerSpecInput(
            type=self.type,
            context=list(self.context) if self.context else None
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
    

class RunTestReponse(BaseModel):
    output: str
    analysis: TestAnalysisSchema
    started_at: datetime
    finished_at: datetime
    

def get_test_service(request: Request):
    return request.app.state.container.test_service
    

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_test(request: CreateTestRequest, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        return test_service.create(db, request.to_dto())
    except InvalidModelConfiguration as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{test_id}")
def update_test(test_id: str, request: UpdateTestRequest, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        test_service.update(db, test_id, request.to_dto())
    except InvalidModelConfiguration as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{test_id}")
def get_test(test_id: str, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        return test_service.get(db, test_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/")
def list_tests(db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    return test_service.list_all(db)


@router.delete("/{test_id}")
def delete_test(test_id: str, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        return test_service.delete(db, test_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{test_id}/run", response_model=RunTestReponse)
async def run_test(test_id: str, request: RunTestRequest, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        result = await test_service.run(db, test_id, request.to_dto())
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidModelConfiguration as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    