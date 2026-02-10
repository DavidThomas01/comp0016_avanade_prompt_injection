# backend/src/api/schemas/runs.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class RunCreate(BaseModel):
    testId: str
    promptOverride: Optional[str] = None
    mitigationsOverride: Optional[List[str]] = None


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    test_id: str = Field(alias="testId")

    prompt_used: str = Field(alias="promptUsed")
    mitigations_used: List[str] = Field(alias="mitigationsUsed")

    model_id: str = Field(alias="modelId")
    response_text: str = Field(alias="responseText")
    raw_response: Optional[Dict[str, Any]] = Field(alias="rawResponse")

    created_at: datetime = Field(alias="createdAt")
