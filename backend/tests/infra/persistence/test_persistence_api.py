from __future__ import annotations

import pytest
from pathlib import Path

from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel, Session, create_engine

from api.server import create_app
from api.deps import get_db_session, get_provider_router
from domain.providers.base_provider import ModelResponse


@pytest.fixture
def test_engine(tmp_path: Path):
    db_path = tmp_path / "test.sqlite"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def app(test_engine):
    app = create_app()

    def override_get_db_session():
        with Session(test_engine) as session:
            yield session

    class DummyRouter:
        async def generate(self, request):
            return ModelResponse(text="dummy-response", raw={"ok": True}, metadata={})

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_provider_router] = lambda: DummyRouter()
    return app


@pytest.mark.asyncio
async def test_suites_crud(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # list empty
        r = await client.get("/api/suites")
        assert r.status_code == 200
        assert r.json() == []

        # create
        r = await client.post("/api/suites", json={"name": "Suite A", "description": "desc"})
        assert r.status_code == 201
        suite = r.json()
        assert suite["id"].startswith("suite-")
        assert suite["name"] == "Suite A"

        # list has it
        r = await client.get("/api/suites")
        assert r.status_code == 200
        suites = r.json()
        assert len(suites) == 1
        assert suites[0]["id"] == suite["id"]

        # delete
        r = await client.delete(f"/api/suites/{suite['id']}")
        assert r.status_code == 204

        # list empty again
        r = await client.get("/api/suites")
        assert r.status_code == 200
        assert r.json() == []


@pytest.mark.asyncio
async def test_tests_crud(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # create suite
        r = await client.post("/api/suites", json={"name": "Suite B"})
        suite = r.json()
        suite_id = suite["id"]

        # list tests empty
        r = await client.get("/api/tests", params={"suiteId": suite_id})
        assert r.status_code == 200
        assert r.json() == []

        # create test (minimal payload)
        r = await client.post("/api/tests", json={"suiteId": suite_id, "name": "Test 1"})
        assert r.status_code == 201
        test = r.json()
        assert test["id"].startswith("test-")
        assert test["suiteId"] == suite_id
        assert test["name"] == "Test 1"

        # list tests has it
        r = await client.get("/api/tests", params={"suiteId": suite_id})
        tests = r.json()
        assert len(tests) == 1
        assert tests[0]["id"] == test["id"]

        # delete test
        r = await client.delete(f"/api/tests/{test['id']}")
        assert r.status_code == 204

        # list empty again
        r = await client.get("/api/tests", params={"suiteId": suite_id})
        assert r.status_code == 200
        assert r.json() == []


@pytest.mark.asyncio
async def test_delete_suite_cascades_tests(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/suites", json={"name": "Suite C"})
        suite_id = r.json()["id"]

        r = await client.post("/api/tests", json={"suiteId": suite_id, "name": "Test Cascade"})
        assert r.status_code == 201

        # delete suite
        r = await client.delete(f"/api/suites/{suite_id}")
        assert r.status_code == 204

        # tests for suite should be empty
        r = await client.get("/api/tests", params={"suiteId": suite_id})
        assert r.status_code == 200
        assert r.json() == []


@pytest.mark.asyncio
async def test_runs_create_and_list(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/suites", json={"name": "Suite Runs"})
        suite_id = r.json()["id"]

        r = await client.post(
            "/api/tests",
            json={
                "suiteId": suite_id,
                "name": "Run Test",
                "prompt": "hello",
                "modelConfig": {"modelId": "gpt-5.2"},
                "requiredMitigations": ["input-validation"],
            },
        )
        test_id = r.json()["id"]

        # create run
        r = await client.post("/api/runs", json={"testId": test_id})
        assert r.status_code == 201
        run = r.json()
        assert run["testId"] == test_id
        assert run["responseText"] == "dummy-response"
        assert run["modelId"] == "gpt-5.2"

        # list runs
        r = await client.get("/api/runs", params={"testId": test_id})
        assert r.status_code == 200
        runs = r.json()
        assert len(runs) == 1
        assert runs[0]["id"] == run["id"]
