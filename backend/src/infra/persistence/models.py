from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import uuid4

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from sqlalchemy.types import JSON


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Suite(SQLModel, table=True):
    __tablename__ = "suites"

    id: str = Field(default_factory=lambda: f"suite-{uuid4()}", primary_key=True)
    name: str
    description: str = ""

    created_at: datetime = Field(default_factory=_utcnow, index=True)
    updated_at: datetime = Field(default_factory=_utcnow, index=True)

    tests: list["Test"] = Relationship(
        back_populates="suite",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Test(SQLModel, table=True):
    __tablename__ = "tests"

    id: str = Field(default_factory=lambda: f"test-{uuid4()}", primary_key=True)

    suite_id: str = Field(foreign_key="suites.id", index=True)
    name: str

    prompt: str = ""
    expected_behavior: str = ""

    required_mitigations: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
    )

    # Pydantic v2 reserves `model_config`, so we expose `model_cfg` in Python,
    # while keeping the DB column name as `model_config`.
    model_cfg: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column("model_config", JSON),
    )

    created_at: datetime = Field(default_factory=_utcnow, index=True)
    updated_at: datetime = Field(default_factory=_utcnow, index=True)

    suite: Optional["Suite"] = Relationship(back_populates="tests")

    runs: list["Run"] = Relationship(
        back_populates="test",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Run(SQLModel, table=True):
    __tablename__ = "runs"

    id: str = Field(default_factory=lambda: f"run-{uuid4()}", primary_key=True)

    test_id: str = Field(foreign_key="tests.id", index=True)

    prompt_used: str = ""
    mitigations_used: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    model_id: str = ""
    response_text: str = ""
    raw_response: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=_utcnow, index=True)

    test: Optional["Test"] = Relationship(back_populates="runs")


class PromptEnhancement(SQLModel, table=True):
    __tablename__ = "prompt_enhancements"

    id: str = Field(default_factory=lambda: f"enh-{uuid4()}", primary_key=True)

    original_prompt: str = ""
    improved_prompt: str = ""
    enhanced_prompt: str = ""

    selected_mitigation_ids: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
    )

    verification_data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON),
    )

    model_id: str = "gpt-5-nano"
    attempts: int = 1

    created_at: datetime = Field(default_factory=_utcnow, index=True)