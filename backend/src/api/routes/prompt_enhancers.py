from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from api.deps import get_db_session, get_provider_router
from api.schemas.prompt_enhancers import PromptEnhancementCreate, PromptEnhancementOut
from infra.persistence.models import PromptEnhancement
from app.provider_router import ProviderRouter
from app.services.prompt_enhancer_service import (
    enhance_prompt_with_validation,
    EnhancementValidationError,
)

router = APIRouter(prefix="/api/prompt-enhancements", tags=["prompt_enhancements"])


@router.post("", response_model=PromptEnhancementOut, status_code=201)
async def enhance_prompt(
    payload: PromptEnhancementCreate,
    session: Session = Depends(get_db_session),
    router_dep: ProviderRouter = Depends(get_provider_router),
) -> PromptEnhancementOut:
    """
    Three-stage prompt enhancement endpoint.
    
    1. Improves prompt structure
    2. Prepends security mitigations
    3. Verifies the result
    
    If verification fails, automatically retries up to maxRetries times.
    """
    
    # Validate input
    if not payload.systemPrompt.strip():
        raise HTTPException(status_code=400, detail="System prompt cannot be empty")
    
    if not payload.selectedMitigationIds:
        raise HTTPException(status_code=400, detail="At least one mitigation must be selected")
    
    try:
        # Run the three-stage pipeline with retries
        result = await enhance_prompt_with_validation(
            original_prompt=payload.systemPrompt,
            mitigation_ids=payload.selectedMitigationIds,
            provider_router=router_dep,
            max_retries=payload.maxRetries,
        )
    except EnhancementValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Enhancement failed: {str(e)}",
        )
    
    # Save to database
    now = datetime.now(timezone.utc)
    enhancement = PromptEnhancement(
        original_prompt=result["original_prompt"],
        improved_prompt=result["improved_prompt"],
        enhanced_prompt=result["enhanced_prompt"],
        selected_mitigation_ids=result["selected_mitigation_ids"],
        verification_data=result["verification_data"],
        model_id=payload.modelId,
        attempts=result["attempts"],
        created_at=now,
    )
    session.add(enhancement)
    session.commit()
    session.refresh(enhancement)
    
    return PromptEnhancementOut.model_validate(enhancement).model_dump(by_alias=True)  # type: ignore[return-value]
