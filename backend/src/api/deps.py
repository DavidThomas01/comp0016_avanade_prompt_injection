# backend/src/api/deps.py
from __future__ import annotations

from infra.persistance.db import SessionLocal
from app.routers.provider_router import ProviderRouter


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_provider_router() -> ProviderRouter:
    return ProviderRouter()