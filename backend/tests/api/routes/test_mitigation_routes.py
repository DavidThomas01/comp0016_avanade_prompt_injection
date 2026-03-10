import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestListMitigationsRoute:
    """Test the GET /api/mitigations/ endpoint."""

    def test_list_mitigations_success(self):
        """Test that mitigations endpoint returns 200 OK."""
        response = client.get("/api/mitigations/")
        assert response.status_code == 200

    def test_list_mitigations_response_structure(self):
        """Test that response has correct structure with mitigations list."""
        response = client.get("/api/mitigations/")
        data = response.json()
        assert "mitigations" in data
        assert isinstance(data["mitigations"], list)

    def test_list_mitigations_not_empty(self):
        """Test that mitigations list is not empty."""
        response = client.get("/api/mitigations/")
        data = response.json()
        assert len(data["mitigations"]) > 0

    def test_list_mitigations_mitigation_structure(self):
        """Test that each mitigation has id, label, and layer fields."""
        response = client.get("/api/mitigations/")
        data = response.json()
        for mitigation in data["mitigations"]:
            assert "id" in mitigation
            assert "label" in mitigation
            assert "layer" in mitigation
            assert isinstance(mitigation["id"], str)
            assert isinstance(mitigation["label"], str)
            assert isinstance(mitigation["layer"], str)

    def test_list_mitigations_contains_expected_mitigations(self):
        """Test that expected mitigations are in the response."""
        response = client.get("/api/mitigations/")
        data = response.json()
        mitigation_ids = [m["id"] for m in data["mitigations"]]
        
        expected_mitigations = [
            "delimiter_tokens",
            "input_validation",
            "pattern_matching",
            "blocklist_filtering",
            "output_sanitization",
            "anomaly_detection",
        ]
        for expected in expected_mitigations:
            assert expected in mitigation_ids

    def test_list_mitigations_response_model(self):
        """Test that response validates against GetMitigationsResponse schema."""
        response = client.get("/api/mitigations/")
        assert response.status_code == 200
        # If schema validation fails, response would be 422
        data = response.json()
        assert "mitigations" in data

    def test_list_mitigations_has_labels(self):
        """Test that all mitigations have non-empty labels."""
        response = client.get("/api/mitigations/")
        data = response.json()
        for mitigation in data["mitigations"]:
            assert len(mitigation["label"].strip()) > 0

    def test_list_mitigations_has_layers(self):
        """Test that all mitigations have non-empty layer values."""
        response = client.get("/api/mitigations/")
        data = response.json()
        for mitigation in data["mitigations"]:
            assert len(mitigation["layer"].strip()) > 0

    def test_list_mitigations_ids_unique(self):
        """Test that all mitigation IDs are unique."""
        response = client.get("/api/mitigations/")
        data = response.json()
        mitigation_ids = [m["id"] for m in data["mitigations"]]
        assert len(mitigation_ids) == len(set(mitigation_ids))

    def test_list_mitigations_content_type(self):
        """Test that response content type is JSON."""
        response = client.get("/api/mitigations/")
        assert response.headers["content-type"].startswith("application/json")

    def test_list_mitigations_valid_layers(self):
        """Test that all layer values are valid mitigation layers."""
        response = client.get("/api/mitigations/")
        data = response.json()
        valid_layers = {"pre_input", "post_output", "prompt", "infrastructure", "monitoring"}
        for mitigation in data["mitigations"]:
            assert mitigation["layer"] in valid_layers

    def test_list_mitigations_has_multiple_layers(self):
        """Test that mitigations span multiple layers."""
        response = client.get("/api/mitigations/")
        data = response.json()
        layers = {m["layer"] for m in data["mitigations"]}
        assert len(layers) > 1
