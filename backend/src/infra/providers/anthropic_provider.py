import os
from typing import Any, Dict, List, Tuple

import httpx

from domain.providers.base_provider import ModelProvider, ModelRequest, ModelResponse, Message
from infra.config.models import MODEL_REGISTRY


class AnthropicProvider(ModelProvider):
	def __init__(self, timeout_seconds: float = 60.0) -> None:
		self._timeout = httpx.Timeout(timeout_seconds)

	async def generate(self, request: ModelRequest) -> ModelResponse:
		config = MODEL_REGISTRY.get(request.model)
		if not config:
			raise ValueError(f"Unknown model '{request.model}'.")
		if config.provider != "anthropic":
			raise ValueError(f"Model '{request.model}' is not an anthropic model.")

		api_key = os.getenv(config.api_key)
		if not api_key:
			raise ValueError(f"Missing API key for '{request.model}' in env var '{config.api_key}'.")

		system_prompt, messages = self._build_messages(request)
		payload: Dict[str, Any] = {
			"model": config.model_name,
			"temperature": request.temperature,
			"messages": [{"role": m.role, "content": m.content} for m in messages],
			"max_tokens": request.metadata.get("max_tokens", 1024),
		}

		if system_prompt:
			payload["system"] = system_prompt

		if request.metadata:
			payload.update(request.metadata)

		headers = {
			"Content-Type": "application/json",
			"x-api-key": api_key,
            "anthropic-version": "2023-06-01",
		}

		async with httpx.AsyncClient(timeout=self._timeout) as client:
			response = await client.post(config.endpoint, json=payload, headers=headers)

		if response.status_code >= 400:
			raise RuntimeError(f"Anthropic provider error {response.status_code}: {response.text}")

		data = response.json()
		text = self._extract_text(data)
		return ModelResponse(text=text, raw=data)

	def _build_messages(self, request: ModelRequest) -> Tuple[str | None, List[Message]]:
		system_prompt = request.system_prompt
		messages: List[Message] = []
		for message in request.messages:
			if message.role == "system" and not system_prompt:
				system_prompt = message.content
				continue
			if message.role != "system":
				messages.append(message)

		return system_prompt, messages

	def _extract_text(self, data: Dict[str, Any]) -> str:
		if isinstance(data, dict):
			content = data.get("content")
			if isinstance(content, list):
				for block in content:
					if isinstance(block, dict) and "text" in block:
						text = block.get("text")
						if isinstance(text, str):
							return text

			if "output_text" in data and isinstance(data["output_text"], str):
				return data["output_text"]

		return ""
