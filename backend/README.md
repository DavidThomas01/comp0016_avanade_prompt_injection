# Backend

FastAPI + SQLite + httpx. Python >= 3.10.

## Running

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env        # fill in API keys for the models you need
PYTHONPATH=src uvicorn main:app --reload --port 8080
```

Swagger docs: http://localhost:8080/docs

## Environment variables

Each model reads its key from an env var defined in `src/infra/config/models.py`. You only need keys for the models you actually use.

| Variable | Model |
|---|---|
| `FOUNDRY_GPT52_KEY` | gpt-5.2 |
| `FOUNDRY_GPT51_KEY` | gpt-5.1 |
| `FOUNDRY_GPT5NANO_KEY` | gpt-5-nano |
| `FOUNDRY_O4NANO_KEY` | o4-nano |
| `FOUNDRY_CLAUDESONNET45_KEY` | claude-sonnet-4-5 |
| `FOUNDRY_CLAUDEHAIKU45_KEY` | claude-haiku-4-5 |
| `FOUNDRY_CLAUDEOPUS41_KEY` | claude-opus-4-1 |
| `FOUNDRY_LLAMA_KEY` | llama-3.3-70b |
| `FOUNDRY_PHI_KEY` | phi-4 |
| `FOUNDRY_DEEPSEEK_KEY` | deepseek-v3.1 |
| `FOUNDRY_MISTRAL_KEY` | mistral-small-2503 |

See `.env.example` for a ready-to-fill template.

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tests` | Create a test |
| `GET` | `/api/tests` | List all tests |
| `GET` | `/api/tests/:id` | Get a test |
| `PATCH` | `/api/tests/:id` | Update a test |
| `DELETE` | `/api/tests/:id` | Delete a test |
| `POST` | `/api/tests/:id/run` | Run a test against an LLM and get analysis |
| `POST` | `/api/chat` | Streaming chat (SSE) with the security assistant |
| `POST` | `/api/prompt-enhancements` | Three-stage prompt enhancement with verification |

## How it works

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed walkthrough of the testing engine, chat assistant, prompt enhancer, model routing, and the layered code structure.

## Structure

```
src/
├── main.py                 # FastAPI app, CORS, router mounting
├── container.py            # Dependency injection container
├── api/
│   ├── routes/             # test_routes, chat_routes, prompt_enhancer_routes
│   └── schemas/            # Pydantic request/response models
├── app/
│   ├── tests/              # TestService + DTOs
│   ├── chat/               # ChatService + system prompts
│   ├── enhancer/           # Three-stage prompt enhancement pipeline
│   └── routers/            # Internal ProviderRouter, RunnerRouter
├── domain/
│   ├── providers/          # ModelProvider ABC, Message, ModelResponse
│   ├── tests/              # Test, TestResult, RunnerSpec, etc.
│   ├── knowledge/          # Vulnerability/mitigation knowledge base for chat
│   └── prompt/             # Prompt compiler (assembles system prompts with mitigations)
└── infra/
    ├── config/             # MODEL_REGISTRY (models.py), chat defaults, mitigation config
    ├── providers/          # OpenAI, Anthropic, OpenAI-compatible implementations + registry
    ├── tests/
    │   ├── runners/        # PromptRunner, FrameworkRunner + registry
    │   └── analyzers/      # Post-run analysis (flag injection, score risk)
    └── persistance/        # SQLAlchemy engine, models, repositories
```

## Contributing

### Adding an LLM provider

1. Create a class in `src/infra/providers/` that implements `ModelProvider` (from `src/domain/providers/base_provider.py`). It needs one method: `async generate(self, request: ModelRequest) -> ModelResponse`.
2. Register it in `src/infra/providers/registry.py` -- add an entry to `_PROVIDER_REGISTRY`.
3. Add model configs that use it in `src/infra/config/models.py` under `MODEL_REGISTRY`.

### Adding a test runner

1. Create a runner class in `src/infra/tests/runners/` following the pattern in `prompt_runner.py`.
2. Register it in `src/infra/tests/runners/registry.py` under `_RUNNER_REGISTRY`.

## Tests

```bash
pip install -e ".[dev]"
pytest
```

Integration tests (call real LLM APIs) are skipped by default. Run them with:

```bash
pytest -m integration
```
