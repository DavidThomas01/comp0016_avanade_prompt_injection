from fastapi import APIRouter
from infra.config.models import get_models
from api.schemas.models import GetModelsResponse, ModelResponse

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("/", response_model=GetModelsResponse)
async def list_models() -> GetModelsResponse:
    """Get all available models."""
    models_dict = get_models()
    models = [ModelResponse(**model_data) for model_data in models_dict.values()]
    return GetModelsResponse(models=models)
    