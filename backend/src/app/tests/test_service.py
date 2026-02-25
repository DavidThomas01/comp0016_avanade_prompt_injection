from sqlalchemy.orm import Session
from domain.prompt.compiler import PromptCompiler
from domain.providers import Message
from domain.tests import *
from infra.config.models import MODEL_REGISTRY
from infra.config.mitigations import MITIGATION_REGISTRY
from infra.tests.runners import *
from infra.persistance.repositories import TestRepository

from .dto import *

from typing import Optional, List

from core.exceptions import *


class TestService():
    
    def __init__(self, repo: TestRepository):
        self.repo = repo
        
    
    def create(self, db: Session, request: CreateTestInput) -> Test:
        model_spec = ModelSpec.create_from_input(request.model)
        environment_spec = EnvironmentSpec.create_from_input(request.environment)
        runner_spec = RunnerSpec.create_from_input(request.runner)
        
        test = Test.create(
            name=request.name,
            model=model_spec,
            environment=environment_spec,
            runner=runner_spec,
        )
        
        return self.repo.create(db, test)
            
            
    def update(self, db: Session, parent_id: Test, request: UpdateTestInput) -> Test:
        parent = self.repo.get_by_id(db, parent_id)
        
        name = name if request.name else parent.name
        model_spec = ModelSpec.create_from_input(request.model) if request.model else parent.model
        environment_spec = EnvironmentSpec.create_from_input(request.environment) if request.environment else parent.environment
        runner_spec = RunnerSpec.create_from_input(request.runner) if request.runner else parent.runner
        
        updated_test = parent.update(
            name=name,
            model=model_spec,
            environment=environment_spec,
            runner=runner_spec,
            created_at=parent.created_at
        )
        
        return self.repo.update(db, updated_test)
        
        
    def get(self, id: str) -> Test:
        test = self.repo.get_by_id(id)
        
        if not test:
            raise NotFoundError("test not found")
            
        return test
            
        
    
    def list_all(self) -> List[Test]:
        return self.repo.list_all()
            
            
    async def run(self, db: Session, id: str, request: RunTestInput) -> TestResult:
        test = self.repo.get_by_id(db, id)
        
        if not test:
            raise NotFoundError("test not found")
        
        runner = self._resolve_runner(test.runner.type)
        
        result = await runner.run(test, Message("user", request.prompt) if request.prompt else None)
        
        if test.runner.type == RunnerType.PROMPT:
            self._update_context_with_response(db, id, test, request.prompt, result.output)
        
        return result 
    
    
    def _resolve_runner(self, runner_type: RunnerType) -> TestRunner:
        if runner_type == RunnerType.PROMPT:
            return PromptRunner()
        if runner_type == RunnerType.FRAMEWORK:
            return FrameworkRunner()
        raise InvalidModelConfiguration(f"unsupported runner type: {runner_type}")
    
    
    def _update_context_with_response(self, db: Session, id: str, test: Test, prompt: str, response: str):
        test.runner.context.extend([
            Message(role="user",content=prompt),
            Message(role="system", content=response)
        ])