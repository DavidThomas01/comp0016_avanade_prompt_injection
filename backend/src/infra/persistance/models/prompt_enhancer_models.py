from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.types import JSON
from sqlalchemy.sql import func

from ..db import Base


def _utcnow():
    return datetime.now()


class PromptEnhancement(Base):
    __tablename__ = "prompt_enhancements"

    id = Column(String, primary_key=True, default=lambda: f"enh-{uuid4()}")

    original_prompt = Column(String, nullable=False, default="")
    improved_prompt = Column(String, nullable=False, default="")
    enhanced_prompt = Column(String, nullable=False, default="")

    selected_mitigation_ids = Column(JSON, nullable=False, default=list)

    verification_data = Column(JSON, nullable=False, default=dict)

    model_id = Column(String, nullable=False, default="gpt-5-nano")

    attempts = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime, nullable=False, default=_utcnow, index=True)