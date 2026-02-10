from domain.providers.base_provider import ModelProvider

from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .openai_compatible_provider import OpenAICompatibleProvider
from infra.config.models import MODEL_REGISTRY, ModelConfig

__all__ = ["MODEL_REGISTRY", "ModelConfig"]

_PROVIDER_REGISTRY = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "openai-compatible": OpenAICompatibleProvider,
}


def get_provider(name: str) -> ModelProvider:
    provider_cls = _PROVIDER_REGISTRY.get(name)

    if provider_cls is None:
        raise ValueError(f"Unknown provider '{name}'")

    return provider_cls()