import pytest
from infra.config.models import get_models, get_model_config, MODEL_REGISTRY


class TestGetModels:
    """Test the get_models() function."""

    def test_get_models_returns_dict(self):
        """Test that get_models returns a dictionary."""
        result = get_models()
        assert isinstance(result, dict)

    def test_get_models_not_empty(self):
        """Test that get_models returns non-empty dictionary."""
        result = get_models()
        assert len(result) > 0

    def test_get_models_dict_structure(self):
        """Test that returned dict has correct structure: id and label keys."""
        result = get_models()
        for model_id, model_data in result.items():
            assert isinstance(model_data, dict)
            assert "id" in model_data
            assert "label" in model_data
            assert model_data["id"] == model_id

    def test_get_models_id_and_label_are_strings(self):
        """Test that id and label are strings."""
        result = get_models()
        for model_id, model_data in result.items():
            assert isinstance(model_data["id"], str)
            assert isinstance(model_data["label"], str)
            assert len(model_data["id"]) > 0
            assert len(model_data["label"]) > 0

    def test_get_models_matches_registry_keys(self):
        """Test that returned models match the MODEL_REGISTRY keys."""
        result = get_models()
        assert set(result.keys()) == set(MODEL_REGISTRY.keys())

    def test_get_models_contains_expected_models(self):
        """Test that common expected models are present."""
        result = get_models()
        expected_models = ["gpt-5.2", "gpt-5.1", "claude-sonnet-4-5", "claude-haiku-4-5"]
        for expected in expected_models:
            assert expected in result
            assert result[expected]["label"] is not None

    def test_get_models_display_names_non_empty(self):
        """Test that all display names are non-empty strings."""
        result = get_models()
        for model_id, model_data in result.items():
            assert isinstance(model_data["label"], str)
            assert len(model_data["label"].strip()) > 0


class TestGetModelConfig:
    """Test the get_model_config() function."""

    def test_get_model_config_valid_model(self):
        """Test retrieving config for a valid model."""
        config = get_model_config("gpt-5.2")
        assert config is not None
        assert config.model_name == "gpt-5.2"
        assert config.provider == "openai"

    def test_get_model_config_returns_correct_type(self):
        """Test that config has required attributes."""
        config = get_model_config("gpt-5.2")
        assert hasattr(config, "provider")
        assert hasattr(config, "endpoint")
        assert hasattr(config, "api_key")
        assert hasattr(config, "model_name")
        assert hasattr(config, "display_name")

    def test_get_model_config_invalid_model_returns_none(self):
        """Test that invalid model ID returns None."""
        config = get_model_config("nonexistent-model")
        assert config is None

    def test_get_model_config_all_models(self):
        """Test that all models in registry have valid configs."""
        for model_id in MODEL_REGISTRY.keys():
            config = get_model_config(model_id)
            assert config is not None
            assert len(config.model_name) > 0
            assert len(config.display_name) > 0
            assert len(config.provider) > 0
