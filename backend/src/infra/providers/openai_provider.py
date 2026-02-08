import os
from typing import Any, Dict, List

import httpx

from domain.providers.base_provider import ModelProvider, ModelRequest, ModelResponse, Message
from infra.config.models import MODEL_REGISTRY


class OpenAIProvider(ModelProvider):
	def __init__(self, timeout_seconds: float = 60.0) -> None:
		self._timeout = httpx.Timeout(timeout_seconds)

	async def generate(self, request: ModelRequest) -> ModelResponse:
		config = MODEL_REGISTRY.get(request.model)
		if not config:
			raise ValueError(f"Unknown model '{request.model}'.")

		api_key = os.getenv(config.api_key)
		if not api_key:
			raise ValueError(f"Missing API key for '{request.model}' in env var '{config.api_key}'.")

		messages = self._build_messages(request)
		payload: Dict[str, Any] = {
			"temperature": request.temperature,
			"model": config.model_name,
		}

		if self._is_responses_endpoint(config.endpoint):
			payload["input"] = [{"role": m.role, "content": m.content} for m in messages]
		else:
			payload["messages"] = [{"role": m.role, "content": m.content} for m in messages]

		if request.metadata:
			payload.update(request.metadata)

		headers = {
			"Content-Type": "application/json",
			"api-key": api_key,
		}

		async with httpx.AsyncClient(timeout=self._timeout) as client:
			response = await client.post(config.endpoint, json=payload, headers=headers)

		if response.status_code >= 400:
			raise RuntimeError(f"OpenAI provider error {response.status_code}: {response.text}")

		data = response.json()
		text = self._extract_text(data)
		return ModelResponse(text=text, raw=data)

	def _build_messages(self, request: ModelRequest) -> List[Message]:
		if request.system_prompt:
			if not request.messages or request.messages[0].role != "system":
				return [Message(role="system", content=request.system_prompt), *request.messages]
		return list(request.messages)

	def _is_responses_endpoint(self, endpoint: str) -> bool:
		return "/responses" in endpoint

	def _extract_text(self, data: Dict[str, Any]) -> str:
		if isinstance(data, dict):
			if "output_text" in data and isinstance(data["output_text"], str):
				return data["output_text"]

			choices = data.get("choices")
			if isinstance(choices, list) and choices:
				message = choices[0].get("message")
				if isinstance(message, dict):
					content = message.get("content")
					if isinstance(content, str):
						return content

			output = data.get("output")
			if isinstance(output, list):
				for item in output:
					if isinstance(item, dict) and "content" in item:
						content = item.get("content")
						if isinstance(content, list):
							for block in content:
								if isinstance(block, dict) and block.get("type") == "output_text":
									text = block.get("text")
									if isinstance(text, str):
										return text

		return ""