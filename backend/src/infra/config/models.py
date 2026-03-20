from dataclasses import dataclass


@dataclass
class ModelConfig:
    provider: str
    endpoint: str
    api_key: str
    model_name: str
    display_name: str


MODEL_REGISTRY = {
    "gpt-5.2": ModelConfig(
        provider="openai",
        endpoint="FOUNDRY_GPT52_ENDPOINT",
        api_key="FOUNDRY_GPT52_KEY",
        model_name="gpt-5.2",
        display_name="gpt-5.2"
    ),
    "gpt-5.1": ModelConfig(
        provider="openai",
        endpoint="FOUNDRY_GPT51_ENDPOINT",
        api_key="FOUNDRY_GPT51_KEY",
        model_name="gpt-5.1",
        display_name="gpt-5.1"
    ),
    "gpt-5-nano": ModelConfig(
        provider="openai",
        endpoint="FOUNDRY_GPT5NANO_ENDPOINT",
        api_key="FOUNDRY_GPT5NANO_KEY",
        model_name="gpt-5-nano",
        display_name="gpt-5-nano"
    ),
    "o4-nano": ModelConfig(
        provider="openai",
        endpoint="FOUNDRY_O4NANO_ENDPOINT",
        api_key="FOUNDRY_O4NANO_KEY",
        model_name="o4-nano",
        display_name="o4-nano"
    ),
    "claude-sonnet-4-5": ModelConfig(
        provider="anthropic",
        endpoint="FOUNDRY_CLAUDESONNET45_ENDPOINT",
        api_key="FOUNDRY_CLAUDESONNET45_KEY",
        model_name="claude-sonnet-4-5",
        display_name="claude-sonnet-4-5"
    ),
    "claude-haiku-4-5": ModelConfig(
        provider="anthropic",
        endpoint="FOUNDRY_CLAUDEHAIKU45_ENDPOINT",
        api_key="FOUNDRY_CLAUDEHAIKU45_KEY",
        model_name="claude-haiku-4-5",
        display_name="claude-haiku-4-5"
    ),
    "claude-opus-4-1": ModelConfig(
        provider="anthropic",
        endpoint="FOUNDRY_CLAUDEOPUS41_ENDPOINT",
        api_key="FOUNDRY_CLAUDEOPUS41_KEY",
        model_name="claude-opus-4-1",
        display_name="claude-opus-4-1"
    ),
    "llama": ModelConfig(
        provider="openai-compatible",
        endpoint="FOUNDRY_LLAMA_ENDPOINT",
        api_key="FOUNDRY_LLAMA_KEY",
        model_name="Llama-3.3-70B-Instruct",
        display_name="llama-3.3-70b"
    ),
    "phi": ModelConfig(
        provider="openai-compatible",
        endpoint="FOUNDRY_PHI_ENDPOINT",
        api_key="FOUNDRY_PHI_KEY",
        model_name="Phi-4",
        display_name="phi-4"
    ),
    "deepseek": ModelConfig(
        provider="openai-compatible",
        endpoint="FOUNDRY_DEEPSEEK_ENDPOINT",
        api_key="FOUNDRY_DEEPSEEK_KEY",
        model_name="DeepSeek-V3.1",
        display_name="deepseek-v3.1"
    ),
    "mistral": ModelConfig(
        provider="openai-compatible",
        endpoint="FOUNDRY_MISTRAL_ENDPOINT",
        api_key="FOUNDRY_MISTRAL_KEY",
        model_name="mistral-small-2503",
        display_name="mistral-small-2503"
    )
}


def get_models() -> dict:
    """Get all available models for the frontend."""
    return {
        model_id: {
            "id": model_id,
            "label": config.display_name,
        }
        for model_id, config in MODEL_REGISTRY.items()
    }


def get_model_config(model_id: str) -> ModelConfig | None:
    """Get a specific model configuration."""
    return MODEL_REGISTRY.get(model_id)