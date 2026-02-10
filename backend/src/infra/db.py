# backend/src/infra/db.py
from __future__ import annotations

import os
from typing import Optional

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event
from sqlalchemy.engine import Engine

_ENGINE: Optional[Engine] = None


def _database_url() -> str:
    # Prefer DATABASE_URL; fallback to a local SQLite file
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    # Relative to backend/ when you run uvicorn from backend/
    return "sqlite:///./data.sqlite"


def get_engine() -> Engine:
    """
    Singleton engine. Also creates tables on first use.
    """
    global _ENGINE
    if _ENGINE is None:
        url = _database_url()
        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}

        _ENGINE = create_engine(url, echo=False, connect_args=connect_args)

        # Enforce FK constraints on SQLite
        if url.startswith("sqlite"):
            @event.listens_for(_ENGINE, "connect")
            def _set_sqlite_pragma(dbapi_connection, _):  # type: ignore[no-redef]
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()

        # Create tables
        SQLModel.metadata.create_all(_ENGINE)

    return _ENGINE


def get_session() -> Session:
    """
    Convenience helper for manual usage. FastAPI will use deps.py instead.
    """
    return Session(get_engine())
