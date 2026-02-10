# backend/src/api/schemas/suites.py
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SuiteCreate(BaseModel):
    name: str
    description: str = ""


class SuiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    description: str

    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
