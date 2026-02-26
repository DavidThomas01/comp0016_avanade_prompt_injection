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
        model_spec = self._build_model(request.model)
        environment_spec = self._build_environment(request.environment)
        runner_spec = self._build_runner(request.runner)
        
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
        model_spec = self._build_model(request.model) if request.model else parent.model
        environment_spec = self._build_environment(request.environment) if request.environment else parent.environment
        runner_spec = self._build_runner(request.runner) if request.runner else parent.runner
        
        updated_test = parent.update(
            name=name,
            model=model_spec,
            environment=environment_spec,
            runner=runner_spec,
            created_at=parent.created_at
        )
        
        return self.repo.update(db, updated_test)
    
    
    def _build_model(self, model_spec_input: ModelSpecInput) -> ModelSpec:
        if model_spec_input.type == ModelType.PLATFORM:
            return ModelSpec.create_platform(model_spec_input.model_id)
        if model_spec_input == ModelType.EXTERNAL:
            return ModelSpec.create_external(model_spec_input.endpoint, model_spec_input.key)
        raise InvalidModelConfiguration(f"invalid model type: {model_spec_input.type}")
    
        
    def _build_environment(self, environment_spec_input: EnvironmentSpecInput) -> EnvironmentSpec:
        if environment_spec_input.type == EnvType.MITIGATION:
            self._build_prompt_environment(environment_spec_input.mitigations, environment_spec_input.system_prompt)
        if environment_spec_input.type == EnvType.CUSTOM:
            return EnvironmentSpec.create_from_system_prompt(environment_spec_input.system_prompt)
        raise InvalidModelConfiguration(f"invalid environment type: {environment_spec_input.type}")
        
    
    def _build_prompt_environment(self, mitigations: List[str], system_prompt: Optional[str] = None):
        try:
            compiled_prompt = PromptCompiler.compile(mitigations, system_prompt)
        except UnknownMitigation as e:
            raise InvalidModelConfiguration(f"invalid model configuration: {e}")
        
        return EnvironmentSpec.create_from_mitigations(mitigations, system_prompt)
        
    
    def _build_runner(self, runner_spec_input: RunnerSpecInput) -> RunnerSpec:
        if runner_spec_input.type == RunnerType.PROMPT:
            return RunnerSpec.create_prompt(runner_spec_input.context)
        if runner_spec_input.type == RunnerType.FRAMEWORK:
            return RunnerSpec.create_framework()
        raise InvalidModelConfiguration(f"invalid runner type: {runner_spec_input.type}")
        
    
    def get(self, db: Session, id: str) -> Test:
        test = self.repo.get_by_id(db, id)
        
        if not test:
            raise NotFoundError("test not found")
            
        return test
            
        
    
    def list_all(self, db: Session) -> List[Test]:
        return self.repo.list_all(db)
            
            
    async def run(self, db: Session, id: str, message: Message) -> TestResult:
        test = self.repo.get_by_id(db, id)
        
        if not test:
            raise NotFoundError("test not found")
        
        runner = self._resolve_runner(test.runner.type)
        
        result = await runner.run(test, message if message else None)
        
        if test.runner.type == RunnerType.PROMPT:
            self._update_context_with_response(db, test, message, result.output)
        
        return result 
    
    
    def _resolve_runner(self, runner_type: RunnerType) -> TestRunner:
        if runner_type == RunnerType.PROMPT:
            return PromptRunner()
        if runner_type == RunnerType.FRAMEWORK:
            return FrameworkRunner()
        raise InvalidModelConfiguration(f"unsupported runner type: {runner_type}")
    
    
    def _update_context_with_response(self, db: Session, test: Test, message: Message, response: str):
        test.runner.context.extend([
            message,
            Message(role="system", content=response)
        ])
        self.repo.update(db, test)