# backend/src/api/routes/tests.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from api.deps import get_db_session
from api.schemas.tests import TestCreate, TestOut
from infra.persistence.models import Suite, Test

router = APIRouter(prefix="/api/tests", tags=["tests"])


@router.get("", response_model=List[TestOut])
def list_tests(
    suiteId: str = Query(...),
    session: Session = Depends(get_db_session),
) -> List[TestOut]:
    tests = session.exec(select(Test).where(Test.suite_id == suiteId).order_by(Test.created_at)).all()
    return [TestOut.model_validate(t).model_dump(by_alias=True) for t in tests]  # type: ignore[return-value]


@router.post("", response_model=TestOut, status_code=201)
def create_test(payload: TestCreate, session: Session = Depends(get_db_session)) -> TestOut:
    suite = session.get(Suite, payload.suiteId)
    if suite is None:
        raise HTTPException(status_code=404, detail="Suite not found")

    now = datetime.now(timezone.utc)
    test = Test(
        suite_id=payload.suiteId,
        name=payload.name,
        prompt=payload.prompt,
        expected_behavior=payload.expectedBehavior,
        required_mitigations=list(payload.requiredMitigations),
        model_cfg=dict(payload.modelConfig),
        created_at=now,
        updated_at=now,
    )
    session.add(test)
    session.commit()
    session.refresh(test)
    return TestOut.model_validate(test).model_dump(by_alias=True)  # type: ignore[return-value]


@router.delete("/{test_id}", status_code=204)
def delete_test(test_id: str, session: Session = Depends(get_db_session)) -> None:
    test = session.get(Test, test_id)
    if test is None:
        raise HTTPException(status_code=404, detail="Test not found")
    session.delete(test)
    session.commit()
