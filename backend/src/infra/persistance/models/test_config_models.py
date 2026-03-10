from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, String
from sqlalchemy.types import JSON

from ..db import Base


def _utcnow() -> datetime:
    return datetime.now()


class TestConfiguration(Base):
    __tablename__ = "test_configurations"

    id = Column(String, primary_key=True, default=lambda: f"cfg-{uuid4()}")
    name = Column(String, nullable=False)
    model = Column(JSON, nullable=False, default=dict)
    environment = Column(JSON, nullable=True)
    runner = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=_utcnow, index=True)
