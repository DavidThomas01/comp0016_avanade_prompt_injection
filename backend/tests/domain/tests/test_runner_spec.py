import pytest

from domain.tests.runner_spec import RunnerSpec, RunnerType
from domain.providers.message import Message
from core.exceptions import InvalidModelConfiguration


class TestRunnerSpec:
    """Tests for RunnerSpec domain entity"""

    def test_create_prompt_runner_without_context(self):
        """Prompt runner can be created without context"""
        spec = RunnerSpec.create_prompt()
        
        assert spec.type == RunnerType.PROMPT
        assert spec.context == []

    def test_create_prompt_runner_with_context(self):
        """Prompt runner can be created with context messages"""
        context = [
            Message(role="system", content="You are helpful."),
            Message(role="user", content="Hello!")
        ]
        
        spec = RunnerSpec.create_prompt(context=context)
        
        assert spec.type == RunnerType.PROMPT
        assert spec.context == context
        assert len(spec.context) == 2

    def test_create_framework_runner(self):
        """Framework runner can be created"""
        spec = RunnerSpec.create_framework()
        
        assert spec.type == RunnerType.FRAMEWORK
        assert spec.context == []

    def test_validate_prompt_runner_success(self):
        """Valid prompt runner passes validation"""
        spec = RunnerSpec.create_prompt(context=[
            Message(role="user", content="Test")
        ])
        spec.validate()  # Should not raise

    def test_validate_framework_runner_success(self):
        """Valid framework runner passes validation"""
        spec = RunnerSpec.create_framework()
        spec.validate()  # Should not raise

    def test_validate_framework_runner_with_context_raises(self):
        """Framework runner with context fails validation"""
        spec = RunnerSpec(
            type=RunnerType.FRAMEWORK,
            context=[Message(role="user", content="Test")]
        )
        
        with pytest.raises(InvalidModelConfiguration, match="cannot include context"):
            spec.validate()
