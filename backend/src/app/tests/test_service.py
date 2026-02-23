from domain.prompt.compiler import PromptCompiler
from domain.tests import *
from infra.config.models import MODEL_REGISTRY
from infra.config.mitigations import MITIGATION_REGISTRY
from infra.tests.runners import *

class TestService():
    
    def create(self, payload: dict) -> Test:
        
        self._require(payload, "model", "runner")
        
        model_spec = self._build_model(payload["model"])
        environment_spec = None
        runner_spec = self._build_runner(payload["runner"])
        
        if model_spec.type == ModelType.PLATFORM:
            self._require(payload, "environment")
            environment_spec = self._build_environment(payload.get("environment"))
            
        return Test.create(
            name=payload["name"],
            model=model_spec,
            environment=environment_spec,
            runner=runner_spec,
        )
            
            
    def update(self, parent: Test, payload: dict) -> Test:
        model_spec = self._build_model(payload["model"]) if "model" in payload else parent.model
        if model_spec.type == ModelType.PLATFORM:
            if "environment" in payload:
                environment_spec = self._build_environment(payload["environment"])
            else:
                environment_spec = parent.environment
        else:
            environment_spec = None
        runner_spec = self._build_runner(payload["runner"]) if "runner" in payload else parent.runner
        return parent.update(
            model=model_spec,
            environment=environment_spec,
            runner=runner_spec
        )
        
    
    def _build_model(self, model_payload) -> ModelSpec:
        if isinstance(model_payload, str):
            return self._build_platform_model(model_payload)
        elif isinstance(model_payload, dict):
            return self._build_external_model(model_payload)
        raise ValueError(f"model payload structure must be string or object")
    
    
    def _build_platform_model(self, model: str) -> ModelSpec:
        if model not in MODEL_REGISTRY:
            raise ValueError(f"unknown platform model: {model}")
        return ModelSpec.create_from_registry(model)
    
    
    def _build_external_model(self, model_config: dict) -> ModelSpec:
        required_fields = ["endpoint", "key"]
        missing = [f for f in required_fields if f not in model_config]
        if missing:
            raise ValueError(f"external model missing configuration fields: {missing}")
        return ModelSpec.create_from_external(model_config)


    def _build_runner(self, runner_payload) -> RunnerSpec:
        if isinstance(runner_payload, str):
            runner_type = self._parse_runner_type(runner_payload)
            return RunnerSpec.create_default(runner_type)
        if isinstance(runner_payload, dict):
            return self._build_runner_from_dict(runner_payload)
        raise ValueError("runner payload must be string or object")
        
        
    def _build_runner_from_dict(self, payload: dict) -> RunnerSpec:
        runner_type_str = payload.get("type")
        if not runner_type_str:
            raise ValueError("runner missing 'type' attribute")
        runner_type = self._parse_runner_type(runner_type_str)
        if runner_type == RunnerType.PROMPT:
            context = payload.get("context", [])
            return RunnerSpec.create_prompt(context)
        if runner_type == RunnerType.FRAMEWORK:
            return RunnerSpec.create_default(RunnerType.FRAMEWORK)
        return RunnerSpec.create_default(runner_type)
    
    
    def _parse_runner_type(self, value: str) -> RunnerType:
        try:
            return RunnerType(value)
        except ValueError:
            raise ValueError(f"unknown runner: {value}")
    
    
    def _build_environment(self, env_payload) -> EnvironmentSpec:
        system_prompt = env_payload.get("system_prompt")
        mitigations = env_payload.get("mitigations")
        if system_prompt and not mitigations:
            return self._build_environment_with_custom_prompt(system_prompt)
        if mitigations and not system_prompt:
            return self._build_environment_with_mitigations(mitigations)
        raise ValueError("environment must include only one of system prompt mitigations")
            
    
    def _build_environment_with_custom_prompt(self, system_prompt: str) -> EnvironmentSpec:
        return EnvironmentSpec.create_from_prompt(system_prompt)
        
        
    def _build_environment_with_mitigations(self, mitigations: list) -> EnvironmentSpec:
        self._validate_mitigations(mitigations)
        system_prompt = self._build_prompt_from_mitigations(mitigations)
        return EnvironmentSpec.create_from_mitigations(mitigations, system_prompt)
        
        
    def _validate_mitigations(mitigations):
        invalid_mitigations = [mitigation for mitigation in mitigations if mitigation not in MITIGATION_REGISTRY]
        if invalid_mitigations:
            raise ValueError(f"some selected mitigations are not available: {invalid_mitigations}")
        
    
    def _build_prompt_from_mitigations(self, mitigations) -> str:
        return PromptCompiler.compile(mitigations, None)
    
    
    def _require(self, payload: dict, *required_fields):
        missing = [f for f in required_fields if f not in payload]
        if missing:
            raise ValueError(f"missing required fields: {missing}")
        
    
    async def run(self, test: Test, prompt=None) -> TestResult:
        
        runner = self._resolve_runner(test)
        
        result = await runner.run(test, prompt if prompt else None)
        
        test.runner.context.extend([prompt, result.output])
        
        return result 
        
        
    def _resolve_runner(self, test: Test) -> TestRunner:
        
        if test.runner.type == RunnerType.PROMPT:
            return PromptRunner()
        
        elif test.runner.type == RunnerType.FRAMEWORK:
            return FrameworkRunner()
        
        raise ValueError("test runner is undefined")