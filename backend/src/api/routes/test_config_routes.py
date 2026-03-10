from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from infra.persistance.db import SessionLocal
from infra.persistance.models.test_config_models import TestConfiguration
from api.schemas.test_configs import SaveTestConfigRequest, SavedTestConfigResponse, UpdateTestConfigRequest


router = APIRouter(prefix="/api/test-configs", tags=["test_configs"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=list[SavedTestConfigResponse])
def list_test_configs(db: Session = Depends(get_db)):
    rows = db.query(TestConfiguration).order_by(desc(TestConfiguration.created_at)).all()
    return [
        SavedTestConfigResponse(
            id=row.id,
            name=row.name,
            model=row.model,
            environment=row.environment,
            runner=row.runner,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.post("/", response_model=SavedTestConfigResponse, status_code=201)
def save_test_config(request: SaveTestConfigRequest, db: Session = Depends(get_db)):
    config = TestConfiguration(
        name=request.name.strip(),
        model=request.model.model_dump(),
        environment=request.environment.model_dump() if request.environment else None,
        runner=request.runner.model_dump(),
    )

    if not config.name:
        raise HTTPException(status_code=400, detail="configuration name is required")

    db.add(config)
    db.commit()
    db.refresh(config)

    return SavedTestConfigResponse(
        id=config.id,
        name=config.name,
        model=config.model,
        environment=config.environment,
        runner=config.runner,
        created_at=config.created_at,
    )


@router.delete("/{config_id}")
def delete_test_config(config_id: str, db: Session = Depends(get_db)):
    config = db.query(TestConfiguration).filter(TestConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="test configuration not found")

    db.delete(config)
    db.commit()
    return {"deleted": True}


@router.patch("/{config_id}", response_model=SavedTestConfigResponse)
def update_test_config(config_id: str, request: UpdateTestConfigRequest, db: Session = Depends(get_db)):
    config = db.query(TestConfiguration).filter(TestConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="test configuration not found")

    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="configuration name is required")

    config.name = name
    config.model = request.model.model_dump()
    config.environment = request.environment.model_dump() if request.environment else None
    config.runner = request.runner.model_dump()

    db.commit()
    db.refresh(config)

    return SavedTestConfigResponse(
        id=config.id,
        name=config.name,
        model=config.model,
        environment=config.environment,
        runner=config.runner,
        created_at=config.created_at,
    )
