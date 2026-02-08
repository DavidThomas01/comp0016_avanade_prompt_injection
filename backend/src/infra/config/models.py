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
    "gpt-5-nano": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.cognitiveservices.azure.com/openai/deployments/gpt-5-nano/chat/completions?api-version=2025-01-01-preview",
        api_key="FOUNDRY_GPT5NANO_KEY",
        model_name="gpt-5-nano"  
    ),
    "o4-nano": ModelConfig(
        provider="openai",
        endpoint="https://comp0016-team28-promptinjectionprotection.cognitiveservices.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview",
        api_key="FOUNDRY_O4NANO_KEY",
        model_name="o4-nano"
    ),
    "claude-sonnet-4-5": ModelConfig(
        provider="anthropic",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/anthropic/v1/messages",
        api_key="FOUNDRY_CLAUDESONNET45_KEY",
        model_name="claude-sonnet-4-5"
    ),
    "claude-haiku-4-5": ModelConfig(
        provider="anthropic",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/anthropic/v1/messages",
        api_key="FOUNDRY_CLAUDEHAIKU45_KEY",
        model_name="claude-haiku-4-5"
    ),
    "claude-opus-4-1": ModelConfig(
        provider="anthropic",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/anthropic/v1/messages",
        api_key="FOUNDRY_CLAUDEOPUS41_KEY",
        model_name="claude-opus-4-1"
    ),
    "llama": ModelConfig(
        provider="openai-compatible",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
        api_key="FOUNDRY_LLAMA_KEY",
        model_name="Llama-3.3-70B-Instruct"
    ),
    "phi": ModelConfig(
        provider="openai-compatible",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
        api_key="FOUNDRY_PHI_KEY",
        model_name="Phi-4"
    ),
    "deepseek": ModelConfig(
        provider="openai-compatible",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
        api_key="FOUNDRY_DEEPSEEK_KEY",
        model_name="DeepSeek-V3.1"
    ),
    "mistral": ModelConfig(
        provider="openai-compatible",
        endpoint="https://comp0016-team28-promptinjectionprotection.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
        api_key="FOUNDRY_MISTRAL_KEY",
        model_name="mistral-small-2503"
    ),
}