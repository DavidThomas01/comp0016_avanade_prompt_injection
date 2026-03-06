# Backend Documentation

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
pip install .
```

2) Start backend (commands)

Run from the `backend/` folder:

```powershell
cd backend
$env:PYTHONPATH="src"
uvicorn src.main:app --reload --port 8080
```

## Example POST

Example of how to create a test from the terminal.

Create a test:

```powershell
$testBody = @{
	name = "Test Manual"
	model = @{
		type = "existing"
		model_id = "gpt-5.2"
	}
	environment = @{
		type = "custom"
		system_prompt = "You are a secure assistant."
		mitigations = @("input-validation")
	}
	runner = @{
		type = "chat"
		context = @()
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

Example of how to view tests from the terminal.

List tests:

```powershell
Invoke-RestMethod "http://localhost:8080/api/tests"
```

Get one test by id:

```powershell
Invoke-RestMethod "http://localhost:8080/api/tests/$testId"
```

## Example DELETE

Example of how to delete a test from the terminal (and verify by doing GET).

Delete a test:

```powershell
Invoke-RestMethod -Method DELETE "http://localhost:8080/api/tests/$testId"
```

Verify deletion (GET):

```powershell
Invoke-RestMethod "http://localhost:8080/api/tests"
```

## How to see visually in localhost

Swagger UI (interactive API docs):

- http://localhost:8080/docs

What you should see:
- A list of endpoints (tests, models, mitigations, chat, prompt-enhancements)
- For each endpoint, a "Try it out" button to send requests from the browser
- Response body and status code after executing a request

OpenAPI schema (raw):

- http://localhost:8080/openapi.json

What you should see:
- A JSON document describing all routes, request bodies, and response schemas
