# backend/src/api/deps.py
from __future__ import annotations

from typing import Generator

from sqlmodel import Session

from infra.db import get_engine
from app.provider_router import ProviderRouter


def get_db_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session


def get_provider_router() -> ProviderRouter:
    return ProviderRouter()
