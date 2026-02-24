"""Unit tests for PromptEnhancerService.

These tests mock the ProviderRouter to avoid calling real AI APIs.
Run with: pytest tests/app/test_prompt_enhancer_service.py
"""

from unittest.mock import Mock, AsyncMock
import pytest
from app.services.prompt_enhancer_service import (
    improve_prompt_structure,
    prepend_mitigations,
    verify_enhancement,
    enhance_prompt_with_validation,
)
from domain.providers.base_provider import ModelResponse
from infra.config.mitigations import MITIGATION_REGISTRY


@pytest.fixture
def mock_provider_router():
    """Create a mock ProviderRouter for testing."""
    mock = Mock()
    # The service calls provider_router.generate(), not get_completion()
    mock.generate = AsyncMock()
    return mock


@pytest.mark.asyncio
async def test_improve_prompt_structure_success(mock_provider_router):
    """Test successful prompt improvement."""
    expected_text = "You are a helpful AI assistant designed to provide accurate information."
    mock_provider_router.generate.return_value = ModelResponse(text=expected_text)
    
    result = await improve_prompt_structure(
        original_prompt="You are helpful",
        provider_router=mock_provider_router
    )
    
    assert result == expected_text
    mock_provider_router.generate.assert_called_once()


@pytest.mark.asyncio
async def test_improve_prompt_structure_invalid_json(mock_provider_router):
    """Test handling of empty response."""
    mock_provider_router.generate.return_value = ModelResponse(text="")
    
    with pytest.raises(ValueError, match="Stage 1.*produced empty response"):
        await improve_prompt_structure(
            original_prompt="You are helpful",
            provider_router=mock_provider_router
        )


@pytest.mark.asyncio
async def test_prepend_mitigations_single():
    """Test prepending a single mitigation."""
    improved_prompt = "You are a helpful assistant."
    mitigation_ids = ["input-validation"]
    
    result = prepend_mitigations(improved_prompt, mitigation_ids)
    
    assert "# Security Guidelines" in result
    assert MITIGATION_REGISTRY["input-validation"] in result
    assert improved_prompt in result


@pytest.mark.asyncio
async def test_prepend_mitigations_multiple():
    """Test prepending multiple mitigations."""
    improved_prompt = "You are a helpful assistant."
    mitigation_ids = ["input-validation", "blocklist-filtering", "output-sanitization"]
    
    result = prepend_mitigations(improved_prompt, mitigation_ids)
    
    assert "# Security Guidelines" in result
    for mitigation_id in mitigation_ids:
        assert MITIGATION_REGISTRY[mitigation_id] in result
    assert improved_prompt in result


@pytest.mark.asyncio
async def test_prepend_mitigations_empty_list():
    """Test prepending with empty mitigation list."""
    improved_prompt = "You are a helpful assistant."
    
    result = prepend_mitigations(improved_prompt, [])
    
    # Even with empty list, still adds headers
    assert "# Security Guidelines" in result
    assert "# System Instructions" in result
    assert improved_prompt in result


@pytest.mark.asyncio
async def test_verify_enhancement_valid(mock_provider_router):
    """Test verification of valid enhanced prompt."""
    verification_json = '''{
        "verdict": "PASS",
        "issues": [],
        "explanation": "All mitigations are present and correctly formatted."
    }'''
    mock_provider_router.generate.return_value = ModelResponse(text=verification_json)
    
    result = await verify_enhancement(
        original_prompt="You are helpful",
        improved_prompt="You are a helpful assistant",
        enhanced_prompt="Enhanced prompt with mitigations",
        mitigation_ids=["input-validation"],
        provider_router=mock_provider_router
    )
    
    assert result["verdict"] == "PASS"
    assert result["issues"] == []
    assert "explanation" in result


@pytest.mark.asyncio
async def test_verify_enhancement_invalid(mock_provider_router):
    """Test verification of invalid enhanced prompt."""
    verification_json = '''{
        "verdict": "FAIL",
        "issues": ["Missing input-validation mitigation"],
        "explanation": "Missing input-validation mitigation."
    }'''
    mock_provider_router.generate.return_value = ModelResponse(text=verification_json)
    
    result = await verify_enhancement(
        original_prompt="You are helpful",
        improved_prompt="You are a helpful assistant",
        enhanced_prompt="Basic prompt without mitigations",
        mitigation_ids=["input-validation"],
        provider_router=mock_provider_router
    )
    
    assert result["verdict"] == "FAIL"
    assert len(result["issues"]) > 0


@pytest.mark.asyncio
async def test_enhance_prompt_with_validation_success_first_try(mock_provider_router):
    """Test full enhancement pipeline succeeds on first attempt."""
    # Mock improvement response
    improvement_text = "You are a helpful AI assistant."
    # Mock verification response
    verification_json = '''{
        "verdict": "PASS",
        "issues": [],
        "explanation": "All good."
    }'''
    
    mock_provider_router.generate.side_effect = [
        ModelResponse(text=improvement_text),
        ModelResponse(text=verification_json)
    ]
    
    result = await enhance_prompt_with_validation(
        original_prompt="You are helpful",
        mitigation_ids=["input-validation"],
        provider_router=mock_provider_router,
        max_retries=3
    )
    
    assert result["improved_prompt"] == "You are a helpful AI assistant."
    assert "# Security Guidelines" in result["enhanced_prompt"]
    assert result["verification_data"]["verdict"] == "PASS"
    assert result["attempts"] == 1


@pytest.mark.asyncio
async def test_enhance_prompt_with_validation_retry_logic(mock_provider_router):
    """Test retry logic when verification fails initially."""
    # First improvement
    improvement_1 = "First attempt."
    verification_fail = '{"verdict": "FAIL", "issues": ["Missing mitigations"], "explanation": "Missing mitigations."}'
    
    # Second improvement (after retry)
    improvement_2 = "Second attempt with better structure."
    verification_success = '{"verdict": "PASS", "issues": [], "explanation": "All good."}'
    
    mock_provider_router.generate.side_effect = [
        ModelResponse(text=improvement_1),
        ModelResponse(text=verification_fail),
        ModelResponse(text=improvement_2),
        ModelResponse(text=verification_success)
    ]
    
    result = await enhance_prompt_with_validation(
        original_prompt="You are helpful",
        mitigation_ids=["input-validation"],
        provider_router=mock_provider_router,
        max_retries=3
    )
    
    assert result["improved_prompt"] == "Second attempt with better structure."
    assert result["verification_data"]["verdict"] == "PASS"
    assert result["attempts"] == 2


@pytest.mark.asyncio
async def test_enhance_prompt_with_validation_max_retries_exceeded(mock_provider_router):
    """Test that enhancement raises exception when max retries exceeded."""
    # Always return invalid verification
    improvement = "Attempted improvement."
    verification_fail = '{"verdict": "FAIL", "issues": ["Still missing"], "explanation": "Still missing."}'
    
    mock_provider_router.generate.side_effect = [
        ModelResponse(text=improvement), ModelResponse(text=verification_fail),  # Attempt 1
        ModelResponse(text=improvement), ModelResponse(text=verification_fail),  # Attempt 2
        ModelResponse(text=improvement), ModelResponse(text=verification_fail),  # Attempt 3
    ]
    
    # Should raise EnhancementValidationError after max retries
    from app.services.prompt_enhancer_service import EnhancementValidationError
    
    with pytest.raises(EnhancementValidationError):
        await enhance_prompt_with_validation(
            original_prompt="You are helpful",
            mitigation_ids=["input-validation"],
            provider_router=mock_provider_router,
            max_retries=3
        )
