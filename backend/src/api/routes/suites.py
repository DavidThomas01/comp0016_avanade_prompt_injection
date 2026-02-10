# backend/src/api/routes/suites.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from api.deps import get_db_session
from api.schemas.suites import SuiteCreate, SuiteOut
from infra.persistence.models import Suite

router = APIRouter(prefix="/api/suites", tags=["suites"])


@router.get("", response_model=List[SuiteOut])
def list_suites(session: Session = Depends(get_db_session)) -> List[SuiteOut]:
    suites = session.exec(select(Suite).order_by(Suite.created_at)).all()
    return [SuiteOut.model_validate(s).model_dump(by_alias=True) for s in suites]  # type: ignore[return-value]


@router.post("", response_model=SuiteOut, status_code=201)
def create_suite(payload: SuiteCreate, session: Session = Depends(get_db_session)) -> SuiteOut:
    now = datetime.now(timezone.utc)
    suite = Suite(name=payload.name, description=payload.description, created_at=now, updated_at=now)
    session.add(suite)
    session.commit()
    session.refresh(suite)
    return SuiteOut.model_validate(suite).model_dump(by_alias=True)  # type: ignore[return-value]


@router.delete("/{suite_id}", status_code=204)
def delete_suite(suite_id: str, session: Session = Depends(get_db_session)) -> None:
    suite = session.get(Suite, suite_id)
    if suite is None:
        raise HTTPException(status_code=404, detail="Suite not found")
    session.delete(suite)
    session.commit()
