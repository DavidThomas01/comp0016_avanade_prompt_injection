from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from .tests import EnvironmentSpecSchema, ModelSpecSchema, RunnerSpecSchema


class SaveTestConfigRequest(BaseModel):
    name: str
    model: ModelSpecSchema
    environment: Optional[EnvironmentSpecSchema] = None
    runner: RunnerSpecSchema


class UpdateTestConfigRequest(BaseModel):
    name: str
    model: ModelSpecSchema
    environment: Optional[EnvironmentSpecSchema] = None
    runner: RunnerSpecSchema


class SavedTestConfigResponse(BaseModel):
    id: str
    name: str
    model: ModelSpecSchema
    environment: Optional[EnvironmentSpecSchema] = None
    runner: RunnerSpecSchema
    created_at: datetime
