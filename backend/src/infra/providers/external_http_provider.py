import json
from copy import deepcopy
from typing import Any

import httpx

from core.exceptions import InvalidModelConfiguration
from domain.providers import ExternalModelProvider, ExternalModelRequest, ModelResponse


class ExternalHttpProvider(ExternalModelProvider):
    def __init__(self, timeout_seconds: float = 60.0) -> None:
        self._timeout = httpx.Timeout(timeout_seconds)

    async def generate(self, request: ExternalModelRequest) -> ModelResponse:
        payload = self._build_payload(request)
        self._validate_payload(payload, request.json_schema)

        headers = self._build_headers(request)
        
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(request.endpoint, json=payload, headers=headers)

        if response.status_code >= 400:
            raise RuntimeError(f"External provider error {response.status_code}: {response.text}")

        data = response.json()
        text = self._extract_response_text(data)
        return ModelResponse(text=text, raw=data)

    def _build_payload(self, request: ExternalModelRequest) -> dict[str, Any]:
        payload = deepcopy(request.payload) if request.payload else {}

        if request.conversation_mode == "single":
            payload[request.message_field] = self._last_message_content(request)
        else:
            payload[request.message_field] = [
                {"role": message.role, "content": message.content} for message in request.messages
            ]

        return payload

    def _validate_payload(self, payload: dict[str, Any], schema: dict[str, Any] | None) -> None:
        if not schema:
            return

        try:
            from jsonschema import ValidationError, validate

            validate(instance=payload, schema=schema)
            return
        except ModuleNotFoundError:
            self._validate_payload_fallback(payload, schema)
        except ValidationError as error:
            raise InvalidModelConfiguration(f"external payload does not match json_schema: {error.message}")

    def _validate_payload_fallback(self, payload: dict[str, Any], schema: dict[str, Any]) -> None:
        """Fallback validator for common schema shapes when jsonschema is unavailable."""
        self._validate_node(payload, schema, path="$")

    def _validate_node(self, value: Any, schema: dict[str, Any], path: str) -> None:
        expected_type = schema.get("type")
        if expected_type and not self._matches_type(value, expected_type):
            raise InvalidModelConfiguration(
                f"external payload does not match json_schema: {path} expected type '{expected_type}'"
            )

        if expected_type == "object":
            required = schema.get("required", [])
            if isinstance(required, list):
                for key in required:
                    if key not in value:
                        raise InvalidModelConfiguration(
                            f"external payload does not match json_schema: {path}.{key} is required"
                        )

            properties = schema.get("properties", {})
            if isinstance(properties, dict):
                for key, child_schema in properties.items():
                    if key in value and isinstance(child_schema, dict):
                        self._validate_node(value[key], child_schema, path=f"{path}.{key}")

        if expected_type == "array":
            items_schema = schema.get("items")
            if isinstance(items_schema, dict):
                for index, item in enumerate(value):
                    self._validate_node(item, items_schema, path=f"{path}[{index}]")

    def _matches_type(self, value: Any, expected_type: str) -> bool:
        if expected_type == "object":
            return isinstance(value, dict)
        if expected_type == "array":
            return isinstance(value, list)
        if expected_type == "string":
            return isinstance(value, str)
        if expected_type == "number":
            return isinstance(value, (int, float)) and not isinstance(value, bool)
        if expected_type == "boolean":
            return isinstance(value, bool)
        if expected_type == "null":
            return value is None
        return True

    def _build_headers(self, request: ExternalModelRequest) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if request.headers:
            headers.update(request.headers)

        return headers

    def _last_message_content(self, request: ExternalModelRequest) -> str:
        if not request.messages:
            raise InvalidModelConfiguration("external request requires at least one message")
        return request.messages[-1].content

    def _extract_response_text(self, data: Any) -> str:
        if not isinstance(data, dict):
            return json.dumps(data)

        content = data.get("content")
        if isinstance(content, list) and content:
            first_item = content[0]
            if isinstance(first_item, dict):
                first_text = first_item.get("text")
                if isinstance(first_text, str):
                    return first_text

        if isinstance(content, str):
            return content

        text = data.get("text")
        if isinstance(text, str):
            return text

        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            if isinstance(first_choice, dict):
                message = first_choice.get("message")
                if isinstance(message, dict):
                    content = message.get("content")
                    if isinstance(content, str):
                        return content

        output_text = data.get("output_text")
        if isinstance(output_text, str):
            return output_text

        return json.dumps(data)
