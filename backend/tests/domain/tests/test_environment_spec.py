import pytest

from domain.tests.environment_spec import EnvironmentSpec, EnvType
from core.exceptions import InvalidModelConfiguration


class TestEnvironmentSpec:
    """Tests for EnvironmentSpec domain entity"""

    def test_create_from_mitigations_success(self):
        """Environment can be created from mitigations"""
        mitigations = ["input-validation", "output-filtering"]
        system_prompt = "You are a helpful assistant with safety mitigations."
        
        spec = EnvironmentSpec.create_from_mitigations(
            mitigations=mitigations,
            system_prompt=system_prompt
        )
        
        assert spec.type == EnvType.MITIGATION
        assert spec.mitigations == mitigations
        assert spec.system_prompt == system_prompt

    def test_create_from_system_prompt_success(self):
        """Environment can be created from custom system prompt"""
        system_prompt = "You are a specialized code reviewer."
        
        spec = EnvironmentSpec.create_from_system_prompt(system_prompt=system_prompt)
        
        assert spec.type == EnvType.CUSTOM
        assert spec.system_prompt == system_prompt
        assert spec.mitigations == []

    def test_validate_mitigation_type_success(self):
        """Valid mitigation environment passes validation"""
        spec = EnvironmentSpec.create_from_mitigations(
            mitigations=["test-mitigation"],
            system_prompt="Test prompt"
        )
        spec.validate()  # Should not raise

    def test_validate_mitigation_type_empty_list_raises(self):
        """Mitigation environment without mitigations fails validation"""
        spec = EnvironmentSpec(
            type=EnvType.MITIGATION,
            system_prompt="Test prompt",
            mitigations=[]
        )
        
        spec.validate()
        
        assert spec.type == EnvType.MITIGATION
        assert not len(spec.mitigations)

    def test_validate_custom_type_success(self):
        """Valid custom environment passes validation"""
        spec = EnvironmentSpec.create_from_system_prompt(
            system_prompt="Custom prompt"
        )
        spec.validate()  # Should not raise

    def test_validate_custom_type_with_none_prompt_raises(self):
        """Custom environment with None prompt fails validation"""
        spec = EnvironmentSpec(
            type=EnvType.CUSTOM,
            system_prompt=None,
            mitigations=[]
        )
        
        with pytest.raises(InvalidModelConfiguration, match="requires custom system prompt"):
            spec.validate()

    def test_validate_custom_type_with_mitigations_raises(self):
        """Custom environment with mitigations fails validation"""
        spec = EnvironmentSpec(
            type=EnvType.CUSTOM,
            system_prompt="Custom prompt",
            mitigations=["input-validation"]
        )
        
        with pytest.raises(InvalidModelConfiguration, match="cannot include mitigations"):
            spec.validate()

    def test_environment_spec_is_frozen(self):
        """EnvironmentSpec is immutable (frozen dataclass)"""
        spec = EnvironmentSpec.create_from_system_prompt(system_prompt="Test")
        
        with pytest.raises(AttributeError):
            spec.system_prompt = "Different prompt"
