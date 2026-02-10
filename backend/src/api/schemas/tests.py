# backend/src/api/schemas/tests.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field, ConfigDict


class TestCreate(BaseModel):
    suiteId: str
    name: str

    prompt: str = ""

    mitigations: List[str] = Field(default_factory=list)
    model_cfg: Dict[str, Any] = Field(default_factory=dict)


class TestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    suite_id: str = Field(alias="suiteId")
    name: str

    prompt: str
    mitigations: List[str]

    model_cfg: Dict[str, Any]

    created_at: datetime
    updated_at: datetime
