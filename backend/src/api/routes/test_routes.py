from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session


from infra.persistance.db import SessionLocal

from app.tests import TestService

from domain.tests import *
from domain.providers import Message

from core.exceptions import *

from app.tests.dto import *

from api.schemas.tests import *


router = APIRouter(prefix="/api/tests", tags=["tests"])
    

def get_test_service(request: Request):
    return request.app.state.container.test_service
    

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_test(request: CreateTestRequest, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        return test_service.create(db, request.to_dto())
    except (InvalidModelConfiguration, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{test_id}")
def update_test(test_id: str, request: UpdateTestRequest, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        return test_service.update(db, test_id, request.to_dto())
    except (InvalidModelConfiguration, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{test_id}")
def get_test(test_id: str, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        return test_service.get(db, test_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/")
def list_tests(db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    return test_service.list_all(db)


@router.delete("/{test_id}")
def delete_test(test_id: str, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        return test_service.delete(db, test_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{test_id}/run", response_model=RunTestReponse)
async def run_test(test_id: str, request: RunTestRequest, db: Session = Depends(get_db), test_service: TestService = Depends(get_test_service)):
    try:
        result = await test_service.run(db, test_id, request.to_dto())
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidModelConfiguration as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/validate-external", response_model=ValidateExternalModelResponse)
async def validate_external_model(
    request: ValidateExternalModelRequest,
    test_service: TestService = Depends(get_test_service),
):
    try:
        model_input, prompt = request.to_dto()
        result = await test_service.validate_external_model(model_input, prompt)
        return ValidateExternalModelResponse(output=result.text, raw=result.raw)
    except (InvalidModelConfiguration, TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))