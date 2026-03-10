from fastapi import APIRouter
from infra.config.mitigations import get_mitigations
from api.schemas.mitigations import GetMitigationsResponse, MitigationResponse

router = APIRouter(prefix="/api/mitigations", tags=["mitigations"])


@router.get("/", response_model=GetMitigationsResponse)
async def list_mitigations() -> GetMitigationsResponse:
    """Get all available mitigations."""
    mitigations_dict = get_mitigations()
    mitigations = [MitigationResponse(**mit_data) for mit_data in mitigations_dict.values()]
    return GetMitigationsResponse(mitigations=mitigations)
