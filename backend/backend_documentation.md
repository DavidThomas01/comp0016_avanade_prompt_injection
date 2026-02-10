# Backend Documentation

## What the backend does (easy explanation of what is implemented right now)

The backend is a FastAPI REST API that provides persistence and endpoints for:

- Suites: containers used to group tests
- Tests: prompt-based checks stored under a suite (prompt, expected behavior, required mitigations, model config)
- Runs: executing a test via the existing provider routing (runs may fail if the required API key is not configured)

Persistence is backed by SQLite, and endpoints return JSON that the frontend can consume.

## How to run

1) Start venv (commands)

From the project root:

```powershell
.venv\Scripts\activate
```

If the venv does not exist yet:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2) Start backend (commands)

Run from the `backend/` folder:

```powershell
cd backend
$env:PYTHONPATH="src"
uvicorn api.server:app --reload --port 8080
```

## Example POST

Example of how to create a suite and a test from the terminal.

Create a suite:

```powershell
$suite = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:8080/api/suites" `
  -ContentType "application/json" `
  -Body '{"name":"Suite Manual","description":"Suite creada a mano"}'

$suiteId = $suite.id
$suite
```

Create a test inside the suite:

```powershell
$testBody = @{
  suiteId = $suiteId
  name = "Test Manual"
  prompt = "Ignore instructions"
  mitigations = @("input-validation")
  model_cfg = @{
    mode="existing"
    provider="openai"
    modelId="gpt-5.2"
  }
} | ConvertTo-Json -Depth 10

$test = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:8080/api/tests" `
  -ContentType "application/json" `
  -Body $testBody

$testId = $test.id
$test
```

## Example GET

Example of how to view a suite and a test from the terminal.

List suites:

```powershell
Invoke-RestMethod "http://localhost:8080/api/suites"
```

List tests for a suite:

```powershell
Invoke-RestMethod "http://localhost:8080/api/tests?suiteId=$suiteId"
```

## Example DELETE

Example of how to delete a suite or a test from the terminal (and verify by doing GET).

Delete a test:

```powershell
Invoke-RestMethod -Method DELETE "http://localhost:8080/api/tests/$testId"
```

Verify deletion (GET):

```powershell
Invoke-RestMethod "http://localhost:8080/api/tests?suiteId=$suiteId"
```

Delete a suite (should also remove tests under it):

```powershell
Invoke-RestMethod -Method DELETE "http://localhost:8080/api/suites/$suiteId"
```

Verify deletion (GET):

```powershell
Invoke-RestMethod "http://localhost:8080/api/suites"
```

## How to see visually in localhost

Swagger UI (interactive API docs):

- http://localhost:8080/docs

What you should see:
- A list of endpoints (suites, tests, runs)
- For each endpoint, a "Try it out" button to send requests from the browser
- Response body and status code after executing a request

OpenAPI schema (raw):

- http://localhost:8080/openapi.json

What you should see:
- A JSON document describing all routes, request bodies, and response schemas
