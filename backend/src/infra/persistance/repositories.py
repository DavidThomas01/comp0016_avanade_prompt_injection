from sqlalchemy import delete
from sqlalchemy.orm import Session
from dataclasses import asdict

from domain.tests import *
from domain.providers import Message

from .models import TestModel


class TestRepository:

    def create(self, db: Session, test: Test) -> Test:
        db_test = TestModel(
            id=test.id,
            name=test.name,
            model=asdict(test.model),
            environment=asdict(test.environment) if test.environment else None,
            runner=asdict(test.runner),
            created_at=test.created_at,
        )

        db.add(db_test)
        db.commit()
        db.refresh(db_test)

        return self._to_domain(db_test)
    

    def update(self, db: Session, updated_test: Test) -> Test:
        test = db.query(TestModel).filter(TestModel.id == updated_test.id).first()
        
        test.name = updated_test.name
        test.model = asdict(updated_test.model)
        test.environment = asdict(updated_test.environment) if updated_test.environment else None
        test.runner = asdict(updated_test.runner)
        
        db.commit()
        db.refresh(test)
        
        return self._to_domain(test)


    def get_by_id(self, db: Session, test_id: str) -> Test | None:
        row = db.query(TestModel).filter(TestModel.id == test_id).first()

        if not row:
            return None

        return self._to_domain(row)


    def list_all(self, db: Session) -> list[Test]:
        rows = db.query(TestModel).all()
        return [self._to_domain(row) for row in rows]
    
    
    def delete_by_id(self, db: Session, test_id: str):
        stmt = delete(TestModel).where(TestModel.id == test_id)
        result = db.execute(stmt)
        db.commit()
        return result.rowcount > 0


    def _to_domain(self, row: TestModel) -> Test:
        return Test(
            id=row.id,
            name=row.name,
            model=self._model_to_domain(row.model),
            environment=self._environment_to_domain(row.environment) if row.environment else None,
            runner=self._runner_to_domain(row.runner),
            created_at=row.created_at,
        )
        
    
    def _model_to_domain(self, model: dict) -> ModelSpec:
        return ModelSpec(**model)
    
    
    def _environment_to_domain(self, environment: dict) -> EnvironmentSpec:
        return EnvironmentSpec(**environment)
    
    
    def _runner_to_domain(self, runner: dict) -> RunnerSpec:
        context = None
        if runner.get("context"):
             context = [Message(**m) for m in runner["context"]]
        return RunnerSpec(
            type=RunnerType(runner["type"]),
            context=context
        )
            