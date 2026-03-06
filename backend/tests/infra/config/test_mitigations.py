import pytest
from infra.config.mitigations import get_mitigations, get_mitigation_config, MITIGATION_REGISTRY
from domain.mitigations import MitigationLayer


class TestGetMitigations:
    """Test the get_mitigations() function."""

    def test_get_mitigations_returns_dict(self):
        """Test that get_mitigations returns a dictionary."""
        result = get_mitigations()
        assert isinstance(result, dict)

    def test_get_mitigations_not_empty(self):
        """Test that get_mitigations returns non-empty dictionary."""
        result = get_mitigations()
        assert len(result) > 0

    def test_get_mitigations_dict_structure(self):
        """Test that returned dict has correct structure: id, label, and layer keys."""
        result = get_mitigations()
        for mit_id, mit_data in result.items():
            assert isinstance(mit_data, dict)
            assert "id" in mit_data
            assert "label" in mit_data
            assert "layer" in mit_data
            assert mit_data["id"] == mit_id

    def test_get_mitigations_fields_are_strings(self):
        """Test that id, label, and layer are strings."""
        result = get_mitigations()
        for mit_id, mit_data in result.items():
            assert isinstance(mit_data["id"], str)
            assert isinstance(mit_data["label"], str)
            assert isinstance(mit_data["layer"], str)
            assert len(mit_data["id"]) > 0
            assert len(mit_data["label"]) > 0
            assert len(mit_data["layer"]) > 0

    def test_get_mitigations_matches_registry_keys(self):
        """Test that returned mitigations match the MITIGATION_REGISTRY keys."""
        result = get_mitigations()
        assert set(result.keys()) == set(MITIGATION_REGISTRY.keys())

    def test_get_mitigations_contains_expected_mitigations(self):
        """Test that common expected mitigations are present."""
        result = get_mitigations()
        expected_mitigations = [
            "delimiter_tokens",
            "input_validation",
            "pattern_matching",
            "blocklist_filtering",
            "output_sanitization",
            "anomaly_detection",
        ]
        for expected in expected_mitigations:
            assert expected in result
            assert result[expected]["label"] is not None
            assert result[expected]["layer"] is not None

    def test_get_mitigations_valid_layers(self):
        """Test that all layer values are valid MitigationLayer values."""
        result = get_mitigations()
        valid_layers = {layer.value for layer in MitigationLayer}
        for mit_id, mit_data in result.items():
            assert mit_data["layer"] in valid_layers

    def test_get_mitigations_layer_values(self):
        """Test that layers contain expected values."""
        result = get_mitigations()
        layers = {mit_data["layer"] for mit_data in result.values()}
        # Should have multiple different layers
        assert len(layers) > 1


class TestGetMitigationConfig:
    """Test the get_mitigation_config() function."""

    def test_get_mitigation_config_valid_mitigation(self):
        """Test retrieving config for a valid mitigation."""
        config = get_mitigation_config("delimiter_tokens")
        assert config is not None
        assert config.id == "delimiter_tokens"
        assert config.name == "Delimiter Tokens"

    def test_get_mitigation_config_returns_correct_type(self):
        """Test that config has required attributes."""
        config = get_mitigation_config("input_validation")
        assert hasattr(config, "id")
        assert hasattr(config, "name")
        assert hasattr(config, "layer")
        assert config.layer is not None

    def test_get_mitigation_config_invalid_mitigation_returns_none(self):
        """Test that invalid mitigation ID returns None."""
        config = get_mitigation_config("nonexistent-mitigation")
        assert config is None

    def test_get_mitigation_config_all_mitigations(self):
        """Test that all mitigations in registry have valid configs."""
        for mit_id in MITIGATION_REGISTRY.keys():
            config = get_mitigation_config(mit_id)
            assert config is not None
            assert config.id == mit_id
            assert len(config.name) > 0
            assert config.layer is not None
            assert isinstance(config.layer, MitigationLayer)

    def test_get_mitigation_config_layer_enum_has_value(self):
        """Test that layer enum has a value attribute."""
        config = get_mitigation_config("delimiter_tokens")
        assert hasattr(config.layer, "value")
        assert isinstance(config.layer.value, str)
