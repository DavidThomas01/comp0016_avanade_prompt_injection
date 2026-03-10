import pytest
from unittest.mock import AsyncMock, Mock, patch, MagicMock
from datetime import datetime
from infra.tests.runners.prompt_runner import PromptRunner
from domain.tests.test import Test
from domain.tests.model_spec import ModelSpec
from domain.tests.environment_spec import EnvironmentSpec
from domain.tests.runner_spec import RunnerSpec
from domain.tests.test_result import TestResult
from domain.providers.message import Message
from domain.providers.model_response import ModelResponse
from domain.mitigations.mitigations_base import MitigationAnalysis, MitigationLayer


class TestPromptRunner:
    """Tests for PromptRunner"""

    @pytest.fixture
    def runner(self):
        """Create a PromptRunner instance for testing"""
        return PromptRunner()

    @pytest.fixture
    def platform_test(self):
        """Create a test with platform model and mitigations"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_mitigations(
            mitigations=["pre_input_filter", "post_output_filter", "monitoring_check"],
            system_prompt=None
        )
        runner_spec = RunnerSpec.create_prompt(context=[
            Message(role="system", content="You are helpful")
        ])
        return Test.create(
            name="Platform Test",
            model=model,
            environment=environment,
            runner=runner_spec
        )

    @pytest.fixture
    def external_test(self):
        """Create a test with external model"""
        model = ModelSpec.create_external(
            endpoint="https://api.example.com/chat"
        )
        runner_spec = RunnerSpec.create_prompt(context=[])
        return Test.create(
            name="External Test",
            model=model,
            environment=None,
            runner=runner_spec
        )

    @pytest.fixture
    def sample_prompt(self):
        """Sample prompt message"""
        return Message(role="user", content="Test prompt")

    @pytest.fixture
    def sample_model_response(self):
        """Sample model response"""
        return ModelResponse(text="Test response from model")

    @pytest.mark.asyncio
    async def test_run_with_platform_model_executes_full_pipeline(self, runner, platform_test, sample_prompt, sample_model_response):
        """Test run executes full mitigation pipeline for platform models"""
        mock_analysis = MitigationAnalysis(flagged=False, score=0.1, reason="Safe")
        
        with patch.object(runner, '_run_test_on_platform_model', new_callable=AsyncMock) as mock_platform, \
             patch.object(runner.analyser, 'analyse', new_callable=AsyncMock) as mock_analyse:
            
            mock_platform.return_value = (sample_model_response, [mock_analysis])
            mock_analyse.return_value = mock_analysis
            
            result = await runner.run(platform_test, sample_prompt)
            
            # Verify platform model runner was called
            mock_platform.assert_called_once_with(platform_test, sample_prompt)
            
            # Verify analyser was called
            mock_analyse.assert_called_once()
            
            # Verify result structure
            assert isinstance(result, TestResult)
            assert result.output == "Test response from model"
            assert result.analysis == mock_analysis
            assert isinstance(result.started_at, datetime)
            assert isinstance(result.finished_at, datetime)
            assert result.finished_at >= result.started_at

    @pytest.mark.asyncio
    async def test_run_with_external_model_skips_mitigations(self, runner, external_test, sample_prompt, sample_model_response):
        """Test run skips mitigations for external models"""
        mock_analysis = MitigationAnalysis(flagged=False, score=0.0, reason="External")
        
        with patch.object(runner, '_run_test_on_external_model', new_callable=AsyncMock) as mock_external, \
             patch.object(runner.analyser, 'analyse', new_callable=AsyncMock) as mock_analyse:
            
            mock_external.return_value = sample_model_response
            mock_analyse.return_value = mock_analysis
            
            result = await runner.run(external_test, sample_prompt)
            
            # Verify external model runner was called
            mock_external.assert_called_once_with(external_test, sample_prompt)
            
            # Verify analyser was called with None mitigation_analysis
            call_args = mock_analyse.call_args[0]
            assert call_args[3] is None  # mitigation_analysis should be None
            
            # Verify result
            assert isinstance(result, TestResult)
            assert result.output == "Test response from model"

    @pytest.mark.asyncio
    async def test_run_without_prompt_raises_value_error(self, runner, platform_test):
        """Test run raises ValueError when prompt is None"""
        with pytest.raises(ValueError, match="custom prompt run requires a prompt"):
            await runner.run(platform_test, None)

    @pytest.mark.asyncio
    async def test_run_calls_analyser_with_correct_arguments(self, runner, platform_test, sample_prompt, sample_model_response):
        """Test analyser is called with correct arguments"""
        mock_analysis = MitigationAnalysis(flagged=True, score=0.8, reason="Detected")
        mitigation_analyses = [mock_analysis]
        
        with patch.object(runner, '_run_test_on_platform_model', new_callable=AsyncMock) as mock_platform, \
             patch.object(runner.analyser, 'analyse', new_callable=AsyncMock) as mock_analyse:
            
            mock_platform.return_value = (sample_model_response, mitigation_analyses)
            mock_analyse.return_value = mock_analysis
            
            await runner.run(platform_test, sample_prompt)
            
            # Verify analyser.analyse was called with correct arguments
            mock_analyse.assert_called_once()
            call_args = mock_analyse.call_args[0]
            assert call_args[0] == sample_model_response  # response
            assert call_args[1] == sample_prompt  # prompt
            assert call_args[2] == platform_test.runner.context  # context
            assert call_args[3] == mitigation_analyses  # mitigation_analysis

    @pytest.mark.asyncio
    async def test_run_test_on_platform_model_applies_mitigations(self, runner, platform_test, sample_prompt, sample_model_response):
        """Test platform model execution applies all mitigation layers"""
        with patch.object(runner, '_run_pre_input_mitigations') as mock_pre, \
             patch.object(runner, '_call_test_prompt_on_platform_model', new_callable=AsyncMock) as mock_call, \
             patch.object(runner, '_run_post_output_mitigations') as mock_post, \
             patch.object(runner, '_run_monitoring_mitigations') as mock_monitor:
            
            # Set up mock returns
            mitigated_prompt = Message(role="user", content="Mitigated prompt")
            mock_pre.return_value = mitigated_prompt
            mock_call.return_value = sample_model_response
            mock_post.return_value = sample_model_response
            mock_monitor.return_value = []
            
            result = await runner._run_test_on_platform_model(platform_test, sample_prompt)
            
            # Verify all mitigation layers were called
            mock_pre.assert_called_once_with(
                platform_test.environment.mitigations,
                sample_prompt,
                platform_test.runner.context
            )
            mock_call.assert_called_once_with(platform_test, mitigated_prompt)
            mock_post.assert_called_once()
            mock_monitor.assert_called_once()
            
            # Verify result is tuple of (response, analysis)
            assert isinstance(result, tuple)
            assert result[0] == sample_model_response
            assert isinstance(result[1], list)

    def test_run_pre_input_mitigations_applied(self, runner, sample_prompt):
        """Test pre-input mitigations are applied"""
        mitigations = ["test_mitigation"]
        context = [Message(role="system", content="System")]
        
        # Mock the mitigation registry
        mock_mitigation = Mock()
        mock_mitigation.layer = MitigationLayer.PRE_INPUT
        mock_context = Mock()
        mock_context.prompt = Message(role="user", content="Filtered")
        mock_mitigation.apply.return_value = mock_context
        
        mock_registry = {"test_mitigation": mock_mitigation}
        
        with patch('infra.tests.runners.prompt_runner.MITIGATION_REGISTRY', mock_registry):
            result = runner._run_pre_input_mitigations(mitigations, sample_prompt, context)
            
            # Verify mitigation was applied
            mock_mitigation.apply.assert_called_once()

    def test_run_post_output_mitigations_applied(self, runner, sample_model_response):
        """Test post-output mitigations are applied"""
        mitigations = ["test_mitigation"]
        context = [Message(role="user", content="Test")]
        
        # Mock the mitigation registry
        mock_mitigation = Mock()
        mock_mitigation.layer = MitigationLayer.POST_OUTPUT
        mock_context = Mock()
        mock_context.response = Message(role="assistant", content="Filtered response")
        mock_mitigation.apply.return_value = mock_context
        
        mock_registry = {"test_mitigation": mock_mitigation}
        
        with patch('infra.tests.runners.prompt_runner.MITIGATION_REGISTRY', mock_registry):
            result = runner._run_post_output_mitigations(mitigations, sample_model_response, context)
            
            # Verify mitigation was applied
            mock_mitigation.apply.assert_called_once()

    def test_run_monitoring_mitigations_collected(self, runner, sample_model_response):
        """Test monitoring mitigations are collected"""
        mitigations = ["test_monitoring"]
        context = [Message(role="user", content="Test")]
        
        # Mock the mitigation registry
        mock_mitigation = Mock()
        mock_mitigation.layer = MitigationLayer.MONITORING
        mock_context = Mock()
        mock_context.analysis = MitigationAnalysis(flagged=True, score=0.9, reason="Flagged")
        mock_mitigation.apply.return_value = mock_context
        
        mock_registry = {"test_monitoring": mock_mitigation}
        
        with patch('infra.tests.runners.prompt_runner.MITIGATION_REGISTRY', mock_registry):
            result = runner._run_monitoring_mitigations(mitigations, sample_model_response, context)
            
            # Verify monitoring was applied
            mock_mitigation.apply.assert_called_once()
            assert isinstance(result, list)
            assert len(result) == 1
            assert result[0] == mock_context.analysis

    @pytest.mark.asyncio
    async def test_call_test_prompt_on_platform_model_uses_correct_request(self, runner, platform_test, sample_prompt):
        """Test platform model call uses correct request format"""
        mock_router = AsyncMock()
        mock_response = ModelResponse(text="Response")
        mock_router.generate.return_value = mock_response
        
        with patch('infra.tests.runners.prompt_runner.ProviderRouter', return_value=mock_router):
            result = await runner._call_test_prompt_on_platform_model(platform_test, sample_prompt)
            
            # Verify ProviderRouter.generate was called
            mock_router.generate.assert_called_once()
            request = mock_router.generate.call_args[0][0]
            
            # Verify request structure
            assert request.model == platform_test.model.model_id
            assert sample_prompt in request.messages
            assert result == mock_response

    @pytest.mark.asyncio
    async def test_run_test_on_external_model_execution(self, runner, external_test, sample_prompt):
        """Test external model execution path"""
        mock_provider = AsyncMock()
        mock_response = ModelResponse(text="External response")
        mock_provider.generate.return_value = mock_response
        
        with patch('infra.tests.runners.prompt_runner.ExternalHttpProvider', return_value=mock_provider):
            result = await runner._run_test_on_external_model(external_test, sample_prompt)
            
            # Verify provider.generate was called
            mock_provider.generate.assert_called_once()
            request = mock_provider.generate.call_args[0][0]
            
            # Verify request has correct endpoint
            assert request.endpoint == external_test.model.endpoint
            assert sample_prompt in request.messages
            assert result == mock_response

    def test_get_mitigations_for_layer_filters_correctly(self, runner):
        """Test _get_mitigations_for_layer filters by layer"""
        mitigations = ["pre_mitigation", "post_mitigation", "monitoring_mitigation"]
        
        # Create mocks for each mitigation with different layers
        pre_mit = Mock()
        pre_mit.layer = MitigationLayer.PRE_INPUT
        post_mit = Mock()
        post_mit.layer = MitigationLayer.POST_OUTPUT
        monitor_mit = Mock()
        monitor_mit.layer = MitigationLayer.MONITORING
        
        mock_registry = {
            "pre_mitigation": pre_mit,
            "post_mitigation": post_mit,
            "monitoring_mitigation": monitor_mit
        }
        
        with patch('infra.tests.runners.prompt_runner.MITIGATION_REGISTRY', mock_registry):
            pre_results = runner._get_mitigations_for_layer(MitigationLayer.PRE_INPUT, mitigations)
            post_results = runner._get_mitigations_for_layer(MitigationLayer.POST_OUTPUT, mitigations)
            monitor_results = runner._get_mitigations_for_layer(MitigationLayer.MONITORING, mitigations)
            
            # Verify filtering
            assert "pre_mitigation" in pre_results
            assert "post_mitigation" in post_results
            assert "monitoring_mitigation" in monitor_results
            assert len(pre_results) == 1
            assert len(post_results) == 1
            assert len(monitor_results) == 1

    def test_is_layer_mitigation_checks_layer(self, runner):
        """Test _is_layer_mitigation correctly identifies layer"""
        mock_mitigation = Mock()
        mock_mitigation.layer = MitigationLayer.PRE_INPUT
        
        mock_registry = {"test": mock_mitigation}
        
        with patch('infra.tests.runners.prompt_runner.MITIGATION_REGISTRY', mock_registry):
            assert runner._is_layer_mitigation(MitigationLayer.PRE_INPUT, "test") is True
            assert runner._is_layer_mitigation(MitigationLayer.POST_OUTPUT, "test") is False
            assert runner._is_layer_mitigation(MitigationLayer.MONITORING, "test") is False

    @pytest.mark.asyncio
    async def test_run_with_empty_mitigation_list(self, runner, sample_prompt):
        """Test run works with empty mitigation list"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_mitigations(
            mitigations=[],
            system_prompt=None
        )
        runner_spec = RunnerSpec.create_prompt(context=[])
        test = Test.create(
            name="Empty Mitigations",
            model=model,
            environment=environment,
            runner=runner_spec
        )
        
        mock_response = ModelResponse(text="Response")
        mock_analysis = MitigationAnalysis(flagged=False, score=0.0, reason="No mitigations")
        
        mock_empty_registry = {}
        
        with patch.object(runner, '_call_test_prompt_on_platform_model', new_callable=AsyncMock) as mock_call, \
             patch.object(runner.analyser, 'analyse', new_callable=AsyncMock) as mock_analyse, \
             patch('infra.tests.runners.prompt_runner.MITIGATION_REGISTRY', mock_empty_registry):
            
            mock_call.return_value = mock_response
            mock_analyse.return_value = mock_analysis
            
            result = await runner.run(test, sample_prompt)
            
            # Should complete successfully
            assert isinstance(result, TestResult)
            assert result.output == "Response"

    @pytest.mark.asyncio
    async def test_analyser_is_initialized_in_constructor(self):
        """Test PromptTestAnalyser is created in __init__"""
        runner = PromptRunner()
        
        # Verify analyser attribute exists and is correct type
        assert hasattr(runner, 'analyser')
        from infra.tests.analyzers.prompt_test_analyser import PromptTestAnalyser
        assert isinstance(runner.analyser, PromptTestAnalyser)
