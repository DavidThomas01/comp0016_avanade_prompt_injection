import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime
from sqlalchemy.orm import Session
from infra.persistance.repositories.test_repository import TestRepository
from infra.persistance.models.test_models import TestModel
from domain.tests.test import Test
from domain.tests.model_spec import ModelSpec
from domain.tests.environment_spec import EnvironmentSpec
from domain.tests.runner_spec import RunnerSpec
from domain.providers.message import Message


class TestTestRepository:
    """Tests for TestRepository"""

    @pytest.fixture
    def repository(self):
        """Create a TestRepository instance"""
        return TestRepository()

    @pytest.fixture
    def mock_session(self):
        """Create a mock SQLAlchemy Session"""
        return Mock(spec=Session)

    @pytest.fixture
    def sample_test(self):
        """Create a sample Test domain object"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_system_prompt(
            system_prompt="You are helpful"
        )
        runner = RunnerSpec.create_prompt(context=[
            Message(role="system", content="Context")
        ])
        return Test.create(
            name="Sample Test",
            model=model,
            environment=environment,
            runner=runner
        )

    @pytest.fixture
    def sample_db_test(self, sample_test):
        """Create a sample TestModel database object"""
        db_test = TestModel(
            id=sample_test.id,
            name=sample_test.name,
            model={"type": "platform", "model_id": "gpt-5.2", "endpoint": None, "key": None},
            environment={"type": "custom", "mitigations": None, "system_prompt": "You are helpful"},
            runner={"type": "prompt", "context": [{"role": "system", "content": "Context"}]},
            created_at=sample_test.created_at
        )
        return db_test

    def test_create_persists_test_and_returns_domain_object(self, repository, mock_session, sample_test):
        """Test create saves test to database and returns domain object"""
        # Set up mock
        mock_session.add = Mock()
        mock_session.commit = Mock()
        mock_session.refresh = Mock()
        
        # Execute
        result = repository.create(mock_session, sample_test)
        
        # Verify database operations
        assert mock_session.add.called
        db_test_added = mock_session.add.call_args[0][0]
        assert isinstance(db_test_added, TestModel)
        assert db_test_added.id == sample_test.id
        assert db_test_added.name == sample_test.name
        assert mock_session.commit.called
        assert mock_session.refresh.called
        
        # Verify return value is domain object
        assert isinstance(result, Test)
        assert result.id == sample_test.id
        assert result.name == sample_test.name

    def test_create_serializes_model_spec_correctly(self, repository, mock_session, sample_test):
        """Test create serializes ModelSpec to dict"""
        result = repository.create(mock_session, sample_test)
        
        db_test = mock_session.add.call_args[0][0]
        assert isinstance(db_test.model, dict)
        assert "model_id" in db_test.model
        assert db_test.model["model_id"] == "gpt-5.2"

    def test_create_handles_none_environment(self, repository, mock_session):
        """Test create handles test without environment"""
        model = ModelSpec.create_external(
            endpoint="https://api.example.com",
            key="sk-test"
        )
        runner = RunnerSpec.create_prompt()
        test = Test.create(
            name="External Test",
            model=model,
            environment=None,
            runner=runner
        )
        
        result = repository.create(mock_session, test)
        
        db_test = mock_session.add.call_args[0][0]
        assert db_test.environment is None

    def test_update_modifies_existing_test(self, repository, mock_session, sample_test, sample_db_test):
        """Test update modifies existing test in database"""
        # Set up mock to return existing test
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = sample_db_test
        mock_session.commit = Mock()
        mock_session.refresh = Mock()
        
        # Create updated test
        updated_test = Test(
            id=sample_test.id,
            name="Updated Name",
            model=sample_test.model,
            environment=sample_test.environment,
            runner=sample_test.runner,
            created_at=sample_test.created_at
        )
        
        # Execute
        result = repository.update(mock_session, updated_test)
        
        # Verify query was made
        mock_session.query.assert_called_with(TestModel)
        
        # Verify test was updated
        assert sample_db_test.name == "Updated Name"
        assert mock_session.commit.called
        assert mock_session.refresh.called
        
        # Verify return value
        assert isinstance(result, Test)
        assert result.name == "Updated Name"

    def test_get_by_id_returns_test_when_exists(self, repository, mock_session, sample_test, sample_db_test):
        """Test get_by_id returns test when it exists"""
        # Set up mock
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = sample_db_test
        
        # Execute
        result = repository.get_by_id(mock_session, sample_test.id)
        
        # Verify query
        mock_session.query.assert_called_with(TestModel)
        
        # Verify result
        assert result is not None
        assert isinstance(result, Test)
        assert result.id == sample_test.id
        assert result.name == sample_test.name

    def test_get_by_id_returns_none_when_not_exists(self, repository, mock_session):
        """Test get_by_id returns None when test doesn't exist"""
        # Set up mock to return None
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None
        
        # Execute
        result = repository.get_by_id(mock_session, "nonexistent_id")
        
        # Verify result is None
        assert result is None

    def test_list_all_returns_all_tests(self, repository, mock_session, sample_db_test):
        """Test list_all returns all tests"""
        # Create multiple db tests
        db_test_2 = TestModel(
            id="test_2",
            name="Test 2",
            model={"type": "platform", "model_id": "gpt-4", "endpoint": None, "key": None},
            environment=None,
            runner={"type": "prompt", "context": []},
            created_at=datetime.now()
        )
        
        # Set up mock
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.all.return_value = [sample_db_test, db_test_2]
        
        # Execute
        result = repository.list_all(mock_session)
        
        # Verify query
        mock_session.query.assert_called_with(TestModel)
        
        # Verify result
        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(test, Test) for test in result)
        assert result[0].name == "Sample Test"
        assert result[1].name == "Test 2"

    def test_list_all_returns_empty_list_when_no_tests(self, repository, mock_session):
        """Test list_all returns empty list when no tests exist"""
        # Set up mock to return empty list
        mock_query = Mock()
        mock_session.query.return_value = mock_query
        mock_query.all.return_value = []
        
        # Execute
        result = repository.list_all(mock_session)
        
        # Verify result
        assert isinstance(result, list)
        assert len(result) == 0

    def test_delete_by_id_removes_test(self, repository, mock_session):
        """Test delete_by_id removes test from database"""
        # Set up mock
        mock_result = Mock()
        mock_result.rowcount = 1
        mock_session.execute.return_value = mock_result
        mock_session.commit = Mock()
        
        # Execute
        result = repository.delete_by_id(mock_session, "test_123")
        
        # Verify execute was called with delete statement
        assert mock_session.execute.called
        assert mock_session.commit.called
        
        # Verify return value (True if deleted)
        assert result is True

    def test_delete_by_id_returns_false_when_not_found(self, repository, mock_session):
        """Test delete_by_id returns False when test doesn't exist"""
        # Set up mock with rowcount 0 (no rows deleted)
        mock_result = Mock()
        mock_result.rowcount = 0
        mock_session.execute.return_value = mock_result
        
        # Execute
        result = repository.delete_by_id(mock_session, "nonexistent_id")
        
        # Verify return value
        assert result is False

    def test_to_domain_converts_correctly(self, repository, sample_db_test):
        """Test _to_domain converts TestModel to Test correctly"""
        # Execute
        result = repository._to_domain(sample_db_test)
        
        # Verify conversion
        assert isinstance(result, Test)
        assert result.id == sample_db_test.id
        assert result.name == sample_db_test.name
        assert isinstance(result.model, ModelSpec)
        assert isinstance(result.environment, EnvironmentSpec)
        assert isinstance(result.runner, RunnerSpec)
        assert result.created_at == sample_db_test.created_at

    def test_to_domain_handles_none_environment(self, repository):
        """Test _to_domain handles None environment"""
        db_test = TestModel(
            id="test_external",
            name="External Test",
            model={"type": "external", "model_id": None, "endpoint": "https://api.example.com", "key": "sk-test"},
            environment=None,
            runner={"type": "prompt", "context": []},
            created_at=datetime.now()
        )
        
        # Execute
        result = repository._to_domain(db_test)
        
        # Verify environment is None
        assert result.environment is None

    def test_model_to_domain_creates_model_spec(self, repository):
        """Test _model_to_domain creates ModelSpec correctly"""
        model_dict = {
            "type": "platform",
            "model_id": "gpt-5.2",
            "endpoint": None,
            "key": None
        }
        
        result = repository._model_to_domain(model_dict)
        
        assert isinstance(result, ModelSpec)
        assert result.model_id == "gpt-5.2"

    def test_environment_to_domain_creates_environment_spec(self, repository):
        """Test _environment_to_domain creates EnvironmentSpec correctly"""
        env_dict = {
            "type": "custom",
            "mitigations": None,
            "system_prompt": "You are helpful"
        }
        
        result = repository._environment_to_domain(env_dict)
        
        assert isinstance(result, EnvironmentSpec)
        assert result.system_prompt == "You are helpful"

    def test_runner_to_domain_creates_runner_spec_with_context(self, repository):
        """Test _runner_to_domain creates RunnerSpec with context"""
        runner_dict = {
            "type": "prompt",
            "context": [
                {"role": "system", "content": "System message"},
                {"role": "user", "content": "User message"}
            ]
        }
        
        result = repository._runner_to_domain(runner_dict)
        
        assert isinstance(result, RunnerSpec)
        assert len(result.context) == 2
        assert all(isinstance(msg, Message) for msg in result.context)
        assert result.context[0].role == "system"
        assert result.context[0].content == "System message"

    def test_runner_to_domain_handles_empty_context(self, repository):
        """Test _runner_to_domain handles None or empty context"""
        runner_dict = {
            "type": "prompt",
            "context": None
        }
        
        result = repository._runner_to_domain(runner_dict)
        
        assert isinstance(result, RunnerSpec)
        assert result.context == []

    def test_create_with_external_model(self, repository, mock_session):
        """Test create works with external model"""
        model = ModelSpec.create_external(
            endpoint="https://api.example.com/v1/chat",
            key="sk-external-key-123"
        )
        runner = RunnerSpec.create_prompt()
        test = Test.create(
            name="External API Test",
            model=model,
            environment=None,
            runner=runner
        )
        
        result = repository.create(mock_session, test)
        
        db_test = mock_session.add.call_args[0][0]
        assert db_test.model["endpoint"] == "https://api.example.com/v1/chat"
        assert db_test.model["key"] == "sk-external-key-123"
        assert db_test.environment is None

    def test_create_with_mitigation_environment(self, repository, mock_session):
        """Test create works with mitigation-based environment"""
        model = ModelSpec.create_platform(model_id="gpt-5.2")
        environment = EnvironmentSpec.create_from_mitigations(
            mitigations=["pre_filter", "post_filter"],
            system_prompt="Custom system"
        )
        runner = RunnerSpec.create_prompt()
        test = Test.create(
            name="Mitigation Test",
            model=model,
            environment=environment,
            runner=runner
        )
        
        result = repository.create(mock_session, test)
        
        db_test = mock_session.add.call_args[0][0]
        assert isinstance(db_test.environment, dict)
        assert "mitigations" in db_test.environment
        assert db_test.environment["mitigations"] == ["pre_filter", "post_filter"]
