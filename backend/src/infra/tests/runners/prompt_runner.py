from domain.tests import *
from domain.providers import *
from app.provider_router import ProviderRouter
from typing import Optional, List
from datetime import datetime
from domain.mitigations import *
from infra.config.mitigations import MITIGATION_REGISTRY
from infra.tests.analyzers import PromptTestAnalyser


class PromptRunner(TestRunner):
    
    def __init__(self):
        self.analyser = PromptTestAnalyser()
    
    def run(self, test: Test, prompt: Optional[Message]) -> TestResult:
        
        if not prompt:
            raise ValueError("custom prompt run requires a prompt")
        
        started_at = datetime.now()
        
        if test.model.type == ModelType.PLATFORM:
            model_response, mitigation_analysis = self._run_test_on_platform_model(test, prompt)
        
            
        elif test.model.type == ModelType.EXTERNAL:
            model_response = self._run_test_on_external_model(test, prompt)
            
        finished_at = datetime.now()
            
        analysis = self.analyser.analyse(model_response, prompt, test.runner.context, mitigation_analysis if mitigation_analysis else None)
        
        return TestResult(
            output = model_response,
            analysis = analysis,
            started_at = started_at,
            finished_at = finished_at
        )
    
    
    def _run_test_on_platform_model(self, test: Test, prompt: Optional[Message]) -> tuple[Message, List[MitigationAnalysis]]:
        prompt = self._run_pre_input_mitigations(test.environment.mitigations, prompt, test.runner.context)
        response = self._call_test_prompt_on_platform_model(test, prompt)
        mitigated_response = self._run_post_output_mitigations(test.environment.mitigations, response, test.runner.context + [prompt])
        mitigation_analysis = self._run_monitoring_mitigations(test.environment.mitigations, mitigated_response, test.runner.context + [prompt])
        return mitigated_response, mitigation_analysis
        
        
    def _run_pre_input_mitigations(self, mitigations: List[str], prompt: Optional[Message], context: List[Message]) -> Message:
        
        mitigation_context = MitigationContext(
            message=prompt,
            context=context,
            metadata={}
        )
        
        for mitigation_name in self._get_mitigations_for_layer(MitigationLayer.PRE_INPUT, mitigations):
            mitigation = MITIGATION_REGISTRY.get(mitigation_name)
            mitigation_context = mitigation.apply(mitigation_context)
            
        return mitigation_context.message


    def _call_test_prompt_on_platform_model(self, test: Test, prompt: Message) -> ModelResponse:
        provider = ProviderRouter()
        
        request = ModelRequest(
            model = test.model.model_id,
            messages = test.runner.context + [prompt],
            system_prompt = test.environment.system_prompt,
        )
        
        return provider.generate(request)
        
        
    def _run_post_output_mitigations(self, mitigations, response, context):
        
        mitigation_context = MitigationContext(
            message=response,
            context=context,
            metadata={}
        )
        
        for mitigation_name in self._get_mitigations_for_layer(MitigationLayer.POST_OUTPUT, mitigations):
            mitigation = MITIGATION_REGISTRY.get(mitigation_name)
            mitigation_context = mitigation.apply(mitigation_context)
            
        return mitigation_context.message
    
    
    def _run_monitoring_mitigations(self, mitigations, response, context) -> List[MitigationAnalysis]:
        
        mitigation_analysis = []
        
        mitigation_context = MitigationContext(
            message=response,
            context=context,
            metadata={},
        )
        
        for mitigation_name in self._get_mitigations_for_layer(MitigationLayer.MONITORING, mitigations):
            mitigation = MITIGATION_REGISTRY.get(mitigation_name)
            mitigation_context = mitigation.apply(mitigation_context)
            mitigation_analysis.append(mitigation_context.analysis)
            
        return mitigation_analysis
            
            
    def _get_layer_mitigations(self, layer, mitigations):
        return [mitigation for mitigation in mitigations if self._is_layer_mitigation(layer, mitigation)]
    
    
    def _is_pre_input_mitigation(self, layer, mitigation):
        return MITIGATION_REGISTRY.get(mitigation).layer == layer
        
        
    def _run_test_on_external_model(self, test: Test, prompt: Optional[Message]) -> ModelResponse:
        provider = ExternalModelProvider()
        request = ExternalModelRequest(
            endpoint=test.model.endpoint,
            key=test.model.key,
            messages=(test.runner.context + [prompt])
        )
        return provider.generate(request)
            