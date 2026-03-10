import pytest

from domain.tests.model_spec import ModelSpec, ModelType
from core.exceptions import InvalidModelConfiguration


class TestModelSpec:
    """Tests for ModelSpec domain entity"""

    def test_create_platform_model_success(self):
        """Platform model can be created with valid model_id"""
        spec = ModelSpec.create_platform(model_id="gpt-5.2")
        
        assert spec.type == ModelType.PLATFORM
        assert spec.model_id == "gpt-5.2"
        assert spec.endpoint is None
        assert spec.headers is None

    def test_create_platform_model_missing_id_raises(self):
        """Platform model without model_id raises InvalidModelConfiguration"""
        with pytest.raises(InvalidModelConfiguration, match="missing model id"):
            ModelSpec.create_platform(model_id=None)

    def test_create_external_model_success(self):
        """External model can be created with endpoint"""
        spec = ModelSpec.create_external(
            endpoint="https://api.example.com/v1",
            headers={"Authorization": "Bearer token"},
            response_text_path="choices.0.message.content",
        )
        
        assert spec.type == ModelType.EXTERNAL
        assert spec.endpoint == "https://api.example.com/v1"
        assert spec.headers == {"Authorization": "Bearer token"}
        assert spec.response_text_path == "choices.0.message.content"
        assert spec.model_id is None

    def test_create_external_model_missing_endpoint_raises(self):
        """External model without endpoint raises InvalidModelConfiguration"""
        with pytest.raises(InvalidModelConfiguration, match="missing endpoint"):
            ModelSpec.create_external(endpoint=None)

    def test_validate_platform_model_success(self):
        """Valid platform model passes validation"""
        spec = ModelSpec.create_platform(model_id="claude-sonnet-4-5")
        spec.validate()  # Should not raise

    def test_validate_platform_model_with_endpoint_raises(self):
        """Platform model with custom endpoint fails validation"""
        spec = ModelSpec(
            type=ModelType.PLATFORM,
            model_id="gpt-5.2",
            endpoint="https://custom.com",
        )
        
        with pytest.raises(InvalidModelConfiguration, match="cannot include custom endpoint"):
            spec.validate()

    def test_validate_external_model_success(self):
        """Valid external model passes validation"""
        spec = ModelSpec.create_external(
            endpoint="https://api.example.com",
            headers={"Authorization": "Bearer token"},
        )
        spec.validate()  # Should not raise

    def test_validate_external_model_with_model_id_raises(self):
        """External model with model_id fails validation"""
        spec = ModelSpec(
            type=ModelType.EXTERNAL,
            model_id="gpt-5.2",
            endpoint="https://api.example.com",
            headers={"Authorization": "Bearer token"},
        )
        
        with pytest.raises(InvalidModelConfiguration, match="cannot include model_id"):
            spec.validate()

    def test_model_spec_is_frozen(self):
        """ModelSpec is immutable (frozen dataclass)"""
        spec = ModelSpec.create_platform(model_id="gpt-5.2")
        
        with pytest.raises(AttributeError):
            spec.model_id = "different-model"
