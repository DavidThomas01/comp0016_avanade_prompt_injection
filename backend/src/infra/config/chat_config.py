# backend/src/infra/config/chat_config.py

DEFAULT_MODEL: str = "gpt-5-nano"

# gpt-5-nano only supports the default temperature (1).
DEFAULT_TEMPERATURE: float = 1

# Maximum agent iterations before forcing a final answer.
MAX_AGENT_TURNS: int = 6

# Only the most recent N messages from conversation history are included.
MAX_HISTORY_MESSAGES: int = 20

# Characters per SSE "delta" event when simulating streaming output.
CHUNK_SIZE: int = 40

# Maximum tokens the LLM may generate per turn.
# Reasoning models (gpt-5-nano) use part of this budget for internal
# chain-of-thought, so this must be large enough for reasoning + output.
MAX_TOKENS: int = 8192
