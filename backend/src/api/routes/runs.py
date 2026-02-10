# backend/src/api/routes/runs.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from api.deps import get_db_session, get_provider_router
from api.schemas.runs import RunCreate, RunOut
from infra.persistence.models import Test, Run
from domain.providers.base_provider import Message, ModelRequest
from app.provider_router import ProviderRouter

router = APIRouter(prefix="/api/runs", tags=["runs"])


def _resolve_model_id(test: Test) -> str:
    # Prefer modelConfig.modelId, fallback to modelConfig.model
    cfg = test.model_cfg or {}
    return str(cfg.get("modelId") or cfg.get("model") or "gpt-5.2")


@router.get("", response_model=List[RunOut])
def list_runs(
    testId: str = Query(...),
    session: Session = Depends(get_db_session),
) -> List[RunOut]:
    runs = session.exec(select(Run).where(Run.test_id == testId).order_by(Run.created_at)).all()
    return [RunOut.model_validate(r).model_dump(by_alias=True) for r in runs]  # type: ignore[return-value]


@router.post("", response_model=RunOut, status_code=201)
async def create_run(
    payload: RunCreate,
    session: Session = Depends(get_db_session),
    router_dep: ProviderRouter = Depends(get_provider_router),
) -> RunOut:
    test = session.get(Test, payload.testId)
    if test is None:
        raise HTTPException(status_code=404, detail="Test not found")

    prompt_used = payload.promptOverride if payload.promptOverride is not None else test.prompt
    mitigations_used = payload.mitigationsOverride if payload.mitigationsOverride is not None else list(test.required_mitigations)

    model_id = _resolve_model_id(test)

    # Build a minimal request for provider router
    req = ModelRequest(
        model=model_id,
        messages=[Message(role="user", content=prompt_used)],
        temperature=0.0,
        metadata={"mitigations": mitigations_used},
    )

    try:
        resp = await router_dep.generate(req)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Model call failed: {e}")

    run = Run(
        test_id=test.id,
        prompt_used=prompt_used,
        mitigations_used=mitigations_used,
        model_id=model_id,
        response_text=resp.text,
        raw_response=resp.raw if isinstance(resp.raw, dict) or resp.raw is None else {"raw": resp.raw},
    )
    session.add(run)
    session.commit()
    session.refresh(run)

    return RunOut.model_validate(run).model_dump(by_alias=True)  # type: ignore[return-value]
