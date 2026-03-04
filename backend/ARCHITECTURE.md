# Backend Architecture

How the backend features are implemented. For setup and API reference, see [README.md](README.md).

## Model routing

All LLM calls go through `ProviderRouter` (`app/routers/provider_router.py`). It takes a model name (e.g. `gpt-5-nano`), looks it up in `MODEL_REGISTRY` to find the provider type and endpoint, then delegates to the right provider implementation (OpenAI, Anthropic, or OpenAI-compatible). This means routes, services, and runners never deal with provider-specific logic directly.

The registry lives in `infra/config/models.py` -- each entry maps a model name to a `ModelConfig` with the provider key, endpoint URL, and the env var that holds the API key. Provider implementations live in `infra/providers/` and all implement a single method: `async generate(request: ModelRequest) -> ModelResponse`.

## Testing engine

A test has three specs: a **model** (which LLM to target), an optional **environment** (system prompt + mitigations), and a **runner** (how to execute it). `TestService` (`app/tests/test_service.py`) handles CRUD and orchestrates runs. Tests are persisted to SQLite via `TestRepository`.

When you run a test, `RunnerRouter` resolves the runner type and delegates. The `PromptRunner` is the main one -- for platform models it works in three phases:

1. **Pre-input mitigations** -- mitigations registered as `PRE_INPUT` layer process the user prompt before it reaches the LLM. This is where input validation and sanitization happen.
2. **LLM call** -- the prompt (plus conversation context) is sent to the model via `ProviderRouter`. The system prompt is assembled by `PromptCompiler` (`domain/prompt/compiler.py`), which appends mitigation instructions from `MITIGATION_REGISTRY` for any mitigations marked as `PROMPT` layer.
3. **Post-output + monitoring** -- `POST_OUTPUT` mitigations filter the response, then `MONITORING` mitigations score it and produce `MitigationAnalysis` results.

After the model responds, `PromptTestAnalyser` (`infra/tests/analyzers/prompt_test_analyser.py`) makes a second LLM call (to `gpt-5-nano`) to evaluate whether the response looks like a successful injection. It feeds the analyser the conversation context, the test prompt, the model's response, and any mitigation analysis. The analyser returns JSON with a `flagged` boolean, a `score` (0.0-1.0), and a `description`. The conversation context is persisted so follow-up messages within the same test keep history.

For external models (user-provided endpoint + key), the runner skips all mitigations and calls the endpoint directly -- the point is to test a model as-is.

## Security knowledge assistant (chat)

`ChatService` (`app/chat/chat_service.py`) powers the `/api/chat` streaming endpoint. On each message:

1. **Knowledge base search** -- `search_knowledge_base` (`domain/knowledge/search.py`) runs BM25-style keyword search over the platform's vulnerability and mitigation catalogue. Each document is scored with weighted term frequency across fields (name is weighted 4x, tags 3x, description 2x, etc.), with a coverage boost for queries where more tokens match. The top 3 results are returned.
2. **Context augmentation** -- matched vulnerabilities and mitigations are formatted into markdown (with their names, descriptions, technical details, and links to frontend pages) and appended to the user's message.
3. **LLM call** -- the augmented message and trimmed conversation history are sent to the LLM with a system prompt (`app/chat/prompts.py`) that instructs it to act as a security assistant, format answers in markdown, and link to the platform's vulnerability/mitigation pages.
4. **SSE streaming** -- the response is split into fixed-size chunks and sent as `delta` events, followed by a `done` event. The route (`api/routes/chat_routes.py`) wraps this in a `StreamingResponse` with appropriate headers for SSE.

## Prompt enhancer

`enhance_prompt_with_validation` (`app/enhancer/prompt_enhancer_service.py`) runs a three-stage pipeline to harden a user's system prompt:

1. **Improve** (LLM call) -- an LLM rewrites the user's system prompt for clarity and structure while preserving its exact intent. The improvement prompt explicitly forbids adding or removing functionality.
2. **Prepend mitigations** (deterministic) -- looks up the selected mitigation IDs in `MITIGATION_REGISTRY`, formats them into a "Security Guidelines" block, and prepends it to the improved prompt.
3. **Verify** (LLM call) -- a second LLM call receives the original, improved, and enhanced prompts plus the required mitigations, and checks four things: intent preserved, all mitigations present, no unintended changes, and coherent structure. It returns a JSON verdict (`PASS` or `FAIL`) with details.

If verification fails, the entire pipeline retries from stage 1 (up to `maxRetries` times, default 3). On success, the result -- original prompt, improved prompt, enhanced prompt, verification data, and attempt count -- is saved to SQLite as a `PromptEnhancement` record.

## Layered architecture

The codebase follows a layered pattern:

- **`api/`** -- HTTP layer. Routes parse requests (via Pydantic schemas), call services, and return responses. No business logic here.
- **`app/`** -- Application services. `TestService`, `ChatService`, and the enhancer pipeline live here. They coordinate domain objects and infrastructure but don't know about HTTP or databases directly.
- **`domain/`** -- Core domain. Defines `ModelProvider`, `Test`, `TestResult`, `RunnerSpec`, the knowledge base models, and `PromptCompiler`. No framework dependencies.
- **`infra/`** -- Infrastructure. Concrete provider implementations (OpenAI, Anthropic), test runners, the analyser, SQLAlchemy models/repositories, and configuration registries. This is the only layer that talks to external services or the database.

`Container` (`container.py`) wires the layers together via dependency injection, and `main.py` mounts everything onto the FastAPI app.
