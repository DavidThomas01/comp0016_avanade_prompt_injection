import pytest

from app.tests import TestService
from app.tests.dto import *
from domain.tests import *
from domain.providers import Message

from unittest.mock import Mock, AsyncMock
import pytest
from core.exceptions import NotFoundError, InvalidModelConfiguration

from datetime import datetime

@pytest.fixture
def ctx():
    mock_repo = Mock()
    
    mock_repo.create.side_effect = lambda db, test: test
    mock_repo.delete_by_id.side_effect = lambda db, id: id is not "missing"
    mock_repo.get_by_id.side_effect = lambda db, id: generate_test(id) if id is not "missing" else None
    mock_repo.update.side_effect = lambda db, test: test
    mock_repo.list_all.return_value = [generate_test("test_1"), generate_test("test_2"), generate_test("test_3")]
    
    mock_runner = Mock()
    
    mock_runner.run = AsyncMock(return_value=TestResult(output="Hello", analysis="Pass", started_at=datetime.now(), finished_at=datetime.now()))
    
    service = TestService(mock_repo, mock_runner)

    class Ctx:
        pass

    ctx = Ctx()
    ctx.repo = mock_repo
    ctx.service = service
    return ctx


def generate_test(id: str) -> Test:
    return Test(
        id=id, 
        name="Test", 
        model=ModelSpec(
            type=ModelType.PLATFORM, 
            model_id="gpt-5.2"
        ), 
        environment=EnvironmentSpec(
            type=EnvType.CUSTOM, 
            system_prompt="Prompt."
        ), 
        runner=RunnerSpec(
            type=RunnerType.PROMPT
        ), 
        created_at=None
    )


def test_create_success(ctx):
    request = CreateTestInput(
        name="Test",
        model=ModelSpecInput(
            type=ModelType.PLATFORM,
            model_id="gpt-5.2"
        ),
        runner=RunnerSpecInput(
            type=RunnerType.FRAMEWORK
        ),
        environment=EnvironmentSpecInput(
            type=EnvType.CUSTOM,
            system_prompt="System Prompt."
        )
    )
    
    response = ctx.service.create(db=None, request=request)
    
    assert response.name == "Test"
    assert response.model.type == ModelType.PLATFORM
    assert response.model.model_id == "gpt-5.2"
    assert response.runner.type == RunnerType.FRAMEWORK
    assert response.environment.type == EnvType.CUSTOM
    assert response.environment.system_prompt == "System Prompt."
    

def test_create_invalid_test_failure(ctx):
    request = CreateTestInput(
        name="Test",
        model=ModelSpecInput(
            type=ModelType.EXTERNAL,
            endpoint="Endpoint",
            key="Key"
        ),
        runner=RunnerSpecInput(
            type=RunnerType.FRAMEWORK
        ),
        environment=EnvironmentSpecInput(
            type=EnvType.CUSTOM,
            system_prompt="System Prompt."
        )
    )
    
    with pytest.raises(InvalidModelConfiguration) as exc:
        ctx.service.create(db=None, request=request)
        
    assert str(exc.value) == "external model cannot include environment"
    

def test_create_incomplete_test_failure(ctx):
    request = CreateTestInput(
        name="Test",
        model=ModelSpecInput(
            type=ModelType.EXTERNAL
        ),
        runner=RunnerSpecInput(
            type=RunnerType.FRAMEWORK
        )
    )
    
    with pytest.raises(InvalidModelConfiguration) as exc:
        ctx.service.create(db=None, request=request)
        
    
def test_update_test_success(ctx):
    request = UpdateTestInput(
        name="Updated Test",
        model=ModelSpecInput(
            type=ModelType.EXTERNAL,
            endpoint="Endpoint",
            key="Key"
        ),
        runner=RunnerSpecInput(
            type=RunnerType.FRAMEWORK
        )
    )
    
    response = ctx.service.update(db=None, parent_id="test_123", request=request)
    
    assert response.id == "test_123"
    assert response.name == "Updated Test"
    assert response.model.type == ModelType.EXTERNAL
    assert response.model.endpoint == "Endpoint"
    assert response.model.key == "Key"
    assert response.runner.type == RunnerType.FRAMEWORK
    assert response.environment == None
    
            
def test_update_test_name_success(ctx):
    request = UpdateTestInput(
        name="New Test Name"
    )
    
    response = ctx.service.update(db=None, parent_id="test_123", request=request)
    
    assert response.id == "test_123"
    assert response.name == "New Test Name"
    assert response.name is not "Test"
    assert response.model.type == ModelType.PLATFORM
    assert response.environment.type == EnvType.CUSTOM
    
    
def test_update_missing_test_failure(ctx):
    with pytest.raises(NotFoundError) as exc:
        ctx.service.update(db=None, parent_id="missing", request=UpdateTestInput())


def test_update_invalid_test_failure(ctx):
    request = UpdateTestInput(
        name="Test",
        model=ModelSpecInput(
            type=ModelType.EXTERNAL
        ),
        runner=RunnerSpecInput(
            type=RunnerType.FRAMEWORK
        )
    )
    
    with pytest.raises(InvalidModelConfiguration) as exc:
        ctx.service.update(db=None, parent_id="test_123", request=request)


def test_get_test_success(ctx):
    test = ctx.service.get(db=None, id="test_123")
    
    assert test.id == "test_123"


def test_get_missing_test_failure(ctx):
    with pytest.raises(NotFoundError):
        ctx.service.get(db=None, id="missing")
        
        
def test_list_all(ctx):
    tests = ctx.service.list_all(db=None)
    
    assert len(tests) == 3
    
    
def test_delete_test_success(ctx):
    is_deleted = ctx.service.delete(db=None, id="test_123")
    
    assert is_deleted


def test_delete_missing_test_failure(ctx):
    with pytest.raises(NotFoundError):
        ctx.service.delete(db=None, id="missing")
        
        
async def test_run_test_success(ctx):
    test = generate_test("test_123")
    
    result = await ctx.service.run(db=None, id="test_123", message=Message(role="user", content="message"))
    
    assert result.output == "Hello"
    assert result.analysis == "Pass"

    
def test_run_missing_test_failure(ctx):
    with pytest.raises(NotFoundError):
        ctx.service.delete(db=None, id="missing")