import pytest
from fastapi.testclient import TestClient
from api.routes.test_routes import get_test_service
from datetime import datetime

from main import app
from core.exceptions import NotFoundError, InvalidModelConfiguration


client = TestClient(app)


class FakeTestService:

    def create(self, db, dto):
        return {
            "id": "test-1",
            "name": dto.name,
        }

    def update(self, db, test_id, dto):
        if test_id == "missing":
            raise NotFoundError("Not found")

    def get(self, db, test_id):
        if test_id == "missing":
            raise NotFoundError("Not found")

        return {"id": test_id, "name": "My Test"}

    def list_all(self, db):
        return [{"id": "1"}, {"id": "2"}]

    def delete(self, db, test_id):
        if test_id == "missing":
            raise NotFoundError("Not found")
        return {"deleted": True}

    async def run(self, db, test_id, message):
        if test_id == "missing":
            raise NotFoundError("Not found")

        return {
            "output": "Hello",
            "analysis": {
                "flagged": False,
                "score": 0.1,
                "reason": "Safe"
            },
            "started_at": datetime.utcnow(),
            "finished_at": datetime.utcnow(),
        }
        

@pytest.fixture(autouse=True)
def override_service():
    app.dependency_overrides[get_test_service] = lambda: FakeTestService()
    yield
    app.dependency_overrides.clear()


def test_create_test_success():
    response = client.post(
        "/api/tests/",
        json={
            "name": "Test A",
            "model": {
                "type": "platform",
                "model_id": "gpt-5.2"
            },
            "environment": {
                "type": "custom",
                "system_prompt": "System Prompt"
            },
            "runner": {
                "type": "prompt",
            }
        }
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Test A"


def test_create_test_validation_error():
    response = client.post(
        "/api/tests/",
        json={"name": "Only name"}
    )

    assert response.status_code == 422


def test_get_test_success():
    response = client.get("/api/tests/test_123")

    assert response.status_code == 200
    assert response.json()["id"] == "test_123"


def test_get_test_not_found():
    response = client.get("/api/tests/missing")

    assert response.status_code == 404


def test_list_tests():
    response = client.get("/api/tests/")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_delete_test_success():
    response = client.delete("/api/tests/123")

    assert response.status_code == 200


def test_delete_test_not_found():
    response = client.delete("/api/tests/missing")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_run_test_success():
    response = client.post(
        "/api/tests/123/run",
        json={"role": "user", "content": "Hi"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["output"] == "Hello"
    assert body["analysis"]["flagged"] is False


def test_run_test_not_found():
    response = client.post(
        "/api/tests/missing/run",
        json={"role": "user", "content": "Hi"}
    )

    assert response.status_code == 404