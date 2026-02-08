from domain.providers.base_provider import ModelRequest, ModelResponse, ModelProvider
from infra.config.models import MODEL_REGISTRY
from infra.providers.registry import get_provider


class ProviderRouter:
    """
    Resolves a model name to a provider and delegates execution.

    This layer centralizes model → provider routing so that API handlers,
    runners, and tests never need to know provider details.
    """

    async def generate(self, request: ModelRequest) -> ModelResponse:
        config = MODEL_REGISTRY.get(request.model)

        if config is None:
            raise ValueError(f"Unknown model '{request.model}'")

        provider: ModelProvider = get_provider(config.provider)

        return await provider.generate(request)