from dataclasses import dataclass


@dataclass
class ModelConfig:
    provider: str
    endpoint: str
    api_key: str
    model_name: str


MODEL_REGISTRY = {
    "gpt-5.2": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.cognitiveservices.azure.com/openai/responses?api-version=2025-04-01-preview",
        api_key="FOUNDRY_GPT52_KEY",
        model_name="gpt-5.2"
    ),
    "gpt-5.1": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.cognitiveservices.azure.com/openai/responses?api-version=2025-04-01-preview",
        api_key="FOUNDRY_GPT51_KEY",
        model_name="gpt-5.1"
    ),
    "o4-nano": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.cognitiveservices.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview",
        api_key="FOUNDRY_O4NANO_KEY",
        model_name="o4-nano"
    ),
    "claude": ModelConfig(
        provider="anthropic",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/anthropic/v1/messages",
        api_key="FOUNDRY_CLAUDE_KEY",
        model_name="claude-sonnet"
    ),
    "llama": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
        api_key="FOUNDRY_LLAMA_KEY",
        model_name="llama-3"
    ),
    "phi": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
        api_key="FOUNDRY_PHI_KEY",
        model_name="phi-3"
    ),
    "deepseek": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
        api_key="FOUNDRY_DEEPSEEK_KEY",
        model_name="deepseek"
    ),
}