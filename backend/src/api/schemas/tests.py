# backend/src/api/schemas/tests.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field, ConfigDict


class TestCreate(BaseModel):
    suiteId: str
    name: str

    prompt: str = ""
    expectedBehavior: str = ""

    requiredMitigations: List[str] = Field(default_factory=list)
    modelConfig: Dict[str, Any] = Field(default_factory=dict)


class TestOut(BaseModel):
    # Pydantic v2 configuration (cannot coexist with a field named `model_config`)
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    suite_id: str = Field(alias="suiteId")
    name: str

    prompt: str
    expected_behavior: str = Field(alias="expectedBehavior")
    required_mitigations: List[str] = Field(alias="requiredMitigations")

    # Internal field renamed to avoid collision with `model_config` (reserved name)
    model_cfg: Dict[str, Any] = Field(alias="modelConfig")

    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
