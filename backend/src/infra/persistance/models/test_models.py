from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import JSON
from ..db import Base

class TestModel(Base):
    __tablename__ = "tests"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    model = Column(JSON, nullable=False)
    environment = Column(JSON, nullable=True)
    runner = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False)