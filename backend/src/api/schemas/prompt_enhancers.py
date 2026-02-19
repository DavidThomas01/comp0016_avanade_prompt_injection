# backend/src/api/schemas/prompt_enhancers.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal
from pydantic import BaseModel, Field, ConfigDict


class PromptEnhancementCreate(BaseModel):
    systemPrompt: str
    selectedMitigationIds: List[str]
    modelId: str = "gpt-5-nano"
    maxRetries: int = 1


class VerificationResult(BaseModel):
    intentPreserved: bool = Field(alias="intent_preserved")
    allMitigationsPresent: bool = Field(alias="all_mitigations_present")
    unintendedChanges: bool = Field(alias="unintended_changes")
    coherent: bool
    missingMitigations: List[str] = Field(alias="missing_mitigations")
    issues: List[str]
    verdict: Literal["PASS", "FAIL"]
    explanation: str

    model_config = ConfigDict(populate_by_name=True)


class PromptEnhancementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    original_prompt: str = Field(alias="originalPrompt")
    improved_prompt: str = Field(alias="improvedPrompt")
    enhanced_prompt: str = Field(alias="enhancedPrompt")

    selected_mitigation_ids: List[str] = Field(alias="selectedMitigationIds")

    verification_data: Dict[str, Any] = Field(alias="verificationData")

    model_id: str = Field(alias="modelId")
    attempts: int

    created_at: datetime = Field(alias="createdAt")