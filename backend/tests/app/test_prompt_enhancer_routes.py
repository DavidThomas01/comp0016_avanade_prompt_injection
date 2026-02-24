"""Integration tests for prompt enhancer API routes.

These tests mock the service layer to avoid calling real AI APIs.
Run with: pytest tests/app/test_prompt_enhancer_routes.py
"""

from unittest.mock import patch, AsyncMock, Mock
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, SQLModel, select
from sqlmodel.pool import StaticPool
from api.server import app
from infra.db import get_session
from api.deps import get_provider_router


@pytest.fixture(scope="function")
def test_db_engine():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture(scope="function")
def test_session(test_db_engine):
    """Create a test database session."""
    # Use a single connection for the entire test
    connection = test_db_engine.connect()
    session = Session(bind=connection)
    yield session
    session.close()
    connection.close()


@pytest.fixture(scope="function")
def client(test_session):
    """Create a test client with overridden database session."""
    def get_test_session():
        yield test_session
    
    # Mock provider router to avoid real API calls
    def get_test_provider_router():
        mock = Mock()
        return mock
    
    app.dependency_overrides[get_session] = get_test_session
    app.dependency_overrides[get_provider_router] = get_test_provider_router
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@patch('api.routes.prompt_enhancers.enhance_prompt_with_validation', new_callable=AsyncMock)
def test_create_enhancement_success(mock_enhance, client):
    """Test successful prompt enhancement endpoint."""
    mock_enhance.return_value = {
        "original_prompt": "You are helpful",
        "improved_prompt": "You are a helpful AI assistant designed to provide accurate information.",
        "enhanced_prompt": "## Security Mitigations\n\nInput Validation...\n\nYou are a helpful AI assistant.",
        "selected_mitigation_ids": ["input-validation"],
        "verification_data": {
            "verdict": "PASS",
            "issues": [],
            "explanation": "All mitigations present."
        },
        "attempts": 1
    }
    
    response = client.post("/api/prompt-enhancements", json={
        "systemPrompt": "You are helpful",
        "selectedMitigationIds": ["input-validation"],
        "modelId": "gpt-5-nano",
        "maxRetries": 1
    })
    
    assert response.status_code == 201
    data = response.json()
    assert "improvedPrompt" in data
    assert "enhancedPrompt" in data
    assert "verificationData" in data
    assert data["verificationData"]["verdict"] == "PASS"
    assert data["attempts"] == 1


@patch('api.routes.prompt_enhancers.enhance_prompt_with_validation', new_callable=AsyncMock)
def test_create_enhancement_validation_error_empty_prompt(mock_enhance, client):
    """Test validation error for empty system prompt."""
    response = client.post("/api/prompt-enhancements", json={
        "systemPrompt": "",
        "selectedMitigationIds": ["input-validation"],
        "modelId": "gpt-5-nano"
    })
    
    assert response.status_code == 400
    assert "detail" in response.json()


@patch('api.routes.prompt_enhancers.enhance_prompt_with_validation', new_callable=AsyncMock)
def test_create_enhancement_validation_error_empty_mitigations(mock_enhance, client):
    """Test validation error for empty mitigation list."""
    response = client.post("/api/prompt-enhancements", json={
        "systemPrompt": "You are helpful",
        "selectedMitigationIds": [],
        "modelId": "gpt-5-nano"
    })
    
    assert response.status_code == 400


@patch('api.routes.prompt_enhancers.enhance_prompt_with_validation', new_callable=AsyncMock)
def test_create_enhancement_service_error(mock_enhance, client):
    """Test handling of service layer errors."""
    mock_enhance.side_effect = Exception("LLM API error")
    
    response = client.post("/api/prompt-enhancements", json={
        "systemPrompt": "You are helpful",
        "selectedMitigationIds": ["input-validation"],
        "modelId": "gpt-5-nano"
    })
    
    assert response.status_code == 502
    assert "detail" in response.json()


@patch('api.routes.prompt_enhancers.enhance_prompt_with_validation', new_callable=AsyncMock)
def test_create_enhancement_with_multiple_mitigations(mock_enhance, client):
    """Test enhancement with multiple mitigations."""
    mock_enhance.return_value = {
        "original_prompt": "You are helpful",
        "improved_prompt": "Enhanced prompt",
        "enhanced_prompt": "Mitigations prepended\n\nEnhanced prompt",
        "selected_mitigation_ids": ["input-validation", "blocklist-filtering", "output-sanitization"],
        "verification_data": {
            "verdict": "PASS",
            "issues": [],
            "explanation": "All three mitigations present."
        },
        "attempts": 1
    }
    
    response = client.post("/api/prompt-enhancements", json={
        "systemPrompt": "You are helpful",
        "selectedMitigationIds": ["input-validation", "blocklist-filtering", "output-sanitization"],
        "modelId": "gpt-5-nano"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["verificationData"]["verdict"] == "PASS"


@patch('api.routes.prompt_enhancers.enhance_prompt_with_validation', new_callable=AsyncMock)
def test_create_enhancement_with_custom_max_retries(mock_enhance, client):
    """Test enhancement with custom max retries."""
    mock_enhance.return_value = {
        "original_prompt": "You are helpful",
        "improved_prompt": "Enhanced",
        "enhanced_prompt": "Mitigations\n\nEnhanced",
        "selected_mitigation_ids": ["input-validation"],
        "verification_data": {"verdict": "PASS", "issues": [], "explanation": "Good"},
        "attempts": 3
    }
    
    response = client.post("/api/prompt-enhancements", json={
        "systemPrompt": "You are helpful",
        "selectedMitigationIds": ["input-validation"],
        "modelId": "gpt-5-nano",
        "maxRetries": 5
    })
    
    assert response.status_code == 201
    assert response.json()["attempts"] == 3


@patch('api.routes.prompt_enhancers.enhance_prompt_with_validation', new_callable=AsyncMock)
def test_create_enhancement_persists_to_database(mock_enhance, client, test_session):
    """Test that enhancement returns valid response."""
    mock_enhance.return_value = {
        "original_prompt": "You are helpful",
        "improved_prompt": "Enhanced",
        "enhanced_prompt": "Mitigations\n\nEnhanced",
        "selected_mitigation_ids": ["input-validation"],
        "verification_data": {"verdict": "PASS", "issues": [], "explanation": "Good"},
        "attempts": 1
    }
    
    response = client.post("/api/prompt-enhancements", json={
        "systemPrompt": "You are helpful",
        "selectedMitigationIds": ["input-validation"],
        "modelId": "gpt-5-nano"
    })
    
    assert response.status_code == 201
    data = response.json()
    
    # Verify response contains expected fields
    assert data["originalPrompt"] == "You are helpful"
    assert data["improvedPrompt"] == "Enhanced"
    assert data["enhancedPrompt"] == "Mitigations\n\nEnhanced"
    assert "createdAt" in data
