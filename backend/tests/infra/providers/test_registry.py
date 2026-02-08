import pytest

from infra.providers.registry import get_provider
from infra.providers.openai_provider import OpenAIProvider
from infra.providers.anthropic_provider import AnthropicProvider
from infra.providers.openai_compatible_provider import OpenAICompatibleProvider


def test_get_openai_provider():
    assert isinstance(get_provider("openai"), OpenAIProvider)
    
    
def test_get_anthropic_provider():
    assert isinstance(get_provider("anthropic"),AnthropicProvider)
    
    
def test_get_openai_compatible_provider():
    assert isinstance(get_provider("openai-compatible"), OpenAICompatibleProvider)
    
    
def test_get_invalid_provider():
    with pytest.raises(ValueError):
        get_provider("invalid-provider")


def test_get_empty_provider():
    with pytest.raises(ValueError):
        get_provider("")