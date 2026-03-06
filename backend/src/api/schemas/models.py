from typing import List
from pydantic import BaseModel


class ModelResponse(BaseModel):
    id: str
    label: str


class GetModelsResponse(BaseModel):
    models: List[ModelResponse]