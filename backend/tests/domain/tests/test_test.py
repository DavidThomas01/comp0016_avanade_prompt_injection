import pytest
from datetime import datetime

from domain.tests.test import Test, new_test_id
from domain.tests.model_spec import ModelSpec
from domain.tests.environment_spec import EnvironmentSpec
from domain.tests.runner_spec import RunnerSpec
from domain.providers.message import Message
from core.exceptions import InvalidModelConfiguration


class TestTestEntity:
    """Tests for Test domain entity"""

    def test_create_test_with_platform_model_and_environment(self):
        """Test can be created with platform model and environment"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_system_prompt(
            system_prompt="You are helpful."
        )
        runner = RunnerSpec.create_prompt()
        
        test = Test.create(
            name="Basic Test",
            model=model,
            environment=environment,
            runner=runner
        )
        
        assert test.id.startswith("test_")
        assert test.name == "Basic Test"
        assert test.model == model
        assert test.environment == environment
        assert test.runner == runner
        assert isinstance(test.created_at, datetime)

    def test_create_test_with_external_model_without_environment(self):
        """Test can be created with external model without environment"""
        model = ModelSpec.create_external(
            endpoint="https://api.example.com",
            key="sk-test"
        )
        runner = RunnerSpec.create_prompt()
        
        test = Test.create(
            name="External Model Test",
            model=model,
            environment=None,
            runner=runner
        )
        
        assert test.id.startswith("test_")
        assert test.name == "External Model Test"
        assert test.model == model
        assert test.environment is None
        assert test.runner == runner

    def test_create_test_platform_model_without_environment_raises(self):
        """Creating test with platform model without environment raises error"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        runner = RunnerSpec.create_prompt()
        
        with pytest.raises(InvalidModelConfiguration, match="platform model requires environment"):
            Test.create(
                name="Invalid Test",
                model=model,
                environment=None,
                runner=runner
            )

    def test_create_test_external_model_with_environment_raises(self):
        """Creating test with external model and environment raises error"""
        model = ModelSpec.create_external(
            endpoint="https://api.example.com",
            key="sk-test"
        )
        environment = EnvironmentSpec.create_from_system_prompt(
            system_prompt="You are helpful."
        )
        runner = RunnerSpec.create_prompt()
        
        with pytest.raises(InvalidModelConfiguration, match="external model cannot include environment"):
            Test.create(
                name="Invalid Test",
                model=model,
                environment=environment,
                runner=runner
            )

    def test_update_test_name(self):
        """Test name can be updated"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_system_prompt(
            system_prompt="You are helpful."
        )
        runner = RunnerSpec.create_prompt()
        
        original_test = Test.create(
            name="Original Name",
            model=model,
            environment=environment,
            runner=runner
        )
        
        updated_test = original_test.update(
            name="Updated Name",
            created_at=original_test.created_at
        )
        
        assert updated_test.id == original_test.id
        assert updated_test.name == "Updated Name"
        assert updated_test.model == original_test.model
        assert updated_test.environment == original_test.environment
        assert updated_test.created_at == original_test.created_at

    def test_update_test_model(self):
        """Test model can be updated"""
        original_model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_system_prompt(
            system_prompt="You are helpful."
        )
        runner = RunnerSpec.create_prompt()
        
        original_test = Test.create(
            name="Test",
            model=original_model,
            environment=environment,
            runner=runner
        )
        
        new_model = ModelSpec.create_platform(model_id="claude-sonnet-4-5")
        updated_test = original_test.update(
            model=new_model,
            created_at=original_test.created_at
        )
        
        assert updated_test.model == new_model
        assert updated_test.model.model_id == "claude-sonnet-4-5"

    def test_update_test_runner(self):
        """Test runner can be updated"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_system_prompt(
            system_prompt="You are helpful."
        )
        original_runner = RunnerSpec.create_prompt()
        
        original_test = Test.create(
            name="Test",
            model=model,
            environment=environment,
            runner=original_runner
        )
        
        new_runner = RunnerSpec.create_prompt(context=[
            Message(role="system", content="New context")
        ])
        updated_test = original_test.update(
            runner=new_runner,
            created_at=original_test.created_at
        )
        
        assert updated_test.runner == new_runner
        assert len(updated_test.runner.context) == 1

    def test_new_test_id_generates_unique_ids(self):
        """new_test_id generates unique identifiers"""
        id1 = new_test_id()
        id2 = new_test_id()
        id3 = new_test_id()
        
        assert id1 != id2
        assert id2 != id3
        assert id1 != id3
        assert all(i.startswith("test_") for i in [id1, id2, id3])
