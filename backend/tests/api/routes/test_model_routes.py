import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestListModelsRoute:
    """Test the GET /api/models/ endpoint."""

    def test_list_models_success(self):
        """Test that models endpoint returns 200 OK."""
        response = client.get("/api/models/")
        assert response.status_code == 200

    def test_list_models_response_structure(self):
        """Test that response has correct structure with models list."""
        response = client.get("/api/models/")
        data = response.json()
        assert "models" in data
        assert isinstance(data["models"], list)

    def test_list_models_not_empty(self):
        """Test that models list is not empty."""
        response = client.get("/api/models/")
        data = response.json()
        assert len(data["models"]) > 0

    def test_list_models_model_structure(self):
        """Test that each model has id and label fields."""
        response = client.get("/api/models/")
        data = response.json()
        for model in data["models"]:
            assert "id" in model
            assert "label" in model
            assert isinstance(model["id"], str)
            assert isinstance(model["label"], str)

    def test_list_models_contains_expected_models(self):
        """Test that expected models are in the response."""
        response = client.get("/api/models/")
        data = response.json()
        model_ids = [model["id"] for model in data["models"]]
        
        expected_models = ["gpt-5.2", "gpt-5.1", "claude-sonnet-4-5"]
        for expected in expected_models:
            assert expected in model_ids

    def test_list_models_response_model(self):
        """Test that response validates against GetModelsResponse schema."""
        response = client.get("/api/models/")
        assert response.status_code == 200
        # If schema validation fails, response would be 422
        data = response.json()
        assert "models" in data

    def test_list_models_has_display_names(self):
        """Test that all models have non-empty display names."""
        response = client.get("/api/models/")
        data = response.json()
        for model in data["models"]:
            assert len(model["label"].strip()) > 0

    def test_list_models_ids_unique(self):
        """Test that all model IDs are unique."""
        response = client.get("/api/models/")
        data = response.json()
        model_ids = [model["id"] for model in data["models"]]
        assert len(model_ids) == len(set(model_ids))

    def test_list_models_content_type(self):
        """Test that response content type is JSON."""
        response = client.get("/api/models/")
        assert response.headers["content-type"].startswith("application/json")
