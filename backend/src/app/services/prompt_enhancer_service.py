from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.provider_router import ProviderRouter
from infra.config.mitigations import MITIGATION_REGISTRY

logger = logging.getLogger(__name__)


class EnhancementValidationError(Exception):
    """Raised when prompt enhancement fails validation after all retries."""
    pass


def prepend_mitigations(
    improved_prompt: str,
    mitigation_ids: List[str],
) -> str:
    """
    Stage 2: Prepend static mitigation templates to the improved prompt (deterministic).
    
    Args:
        improved_prompt: Prompt after improvement stage
        mitigation_ids: List of mitigation IDs to apply
        
    Returns:
        Full enhanced prompt with mitigations prepended
    """
    # Build mitigation block
    mitigation_block = "# Security Guidelines\n\n"
    
    for mit_id in mitigation_ids:
        if mit_id in MITIGATION_REGISTRY:
            mitigation_block += f"- {MITIGATION_REGISTRY[mit_id]}\n\n"
    
    mitigation_block += "# System Instructions\n\n"
    
    # Prepend mitigations
    enhanced = mitigation_block + improved_prompt
    
    return enhanced

async def enhance_prompt_with_validation(
    original_prompt: str,
    mitigation_ids: List[str],
    provider_router: ProviderRouter,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Three-stage enhancement pipeline with retries.
    
    Stage 1: Improve prompt structure
    Stage 2: Prepend mitigations (deterministic)
    Stage 3: Verify result with LLM validation
    
    If validation fails, retry the entire pipeline up to max_retries times.
    
    Args:
        original_prompt: User's base system prompt
        mitigation_ids: List of mitigation IDs to apply
        provider_router: ProviderRouter to call LLMs
        max_retries: Maximum number of retry attempts
        
    Returns:
        Dictionary with all prompts and verification result
        
    Raises:
        EnhancementValidationError: If validation fails after all retries
    """
    
    for attempt in range(max_retries):
        try:
            # Stage 1: Improve prompt structure
            logger.info(f"Enhancement attempt {attempt + 1}/{max_retries}: Stage 1 (improve)")
            improved_prompt = await improve_prompt_structure(original_prompt, provider_router)
            
            # Stage 2: Prepend mitigations (deterministic, no retry needed)
            logger.info("Enhancement attempt: Stage 2 (prepend mitigations)")
            enhanced_prompt = prepend_mitigations(improved_prompt, mitigation_ids)
            
            # Stage 3: Verify the result
            logger.info("Enhancement attempt: Stage 3 (verify)")
            verification = await verify_enhancement(
                original_prompt=original_prompt,
                improved_prompt=improved_prompt,
                enhanced_prompt=enhanced_prompt,
                mitigation_ids=mitigation_ids,
                provider_router=provider_router,
            )
            
            # Check verdict
            if verification.get("verdict") == "PASS":
                logger.info(f"Enhancement PASSED on attempt {attempt + 1}")
                return {
                    "original_prompt": original_prompt,
                    "improved_prompt": improved_prompt,
                    "enhanced_prompt": enhanced_prompt,
                    "selected_mitigation_ids": mitigation_ids,
                    "verification_data": verification,
                    "attempts": attempt + 1,
                }
            else:
                # Validation failed, log and retry
                issues = verification.get("issues", [])
                logger.warning(
                    f"Enhancement FAILED on attempt {attempt + 1}. "
                    f"Issues: {', '.join(issues) if issues else 'Unknown'}"
                )
                
                if attempt < max_retries - 1:
                    logger.info(f"Retrying... ({max_retries - attempt - 1} attempts remaining)")
                
        except Exception as e:
            logger.error(f"Enhancement error on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying... ({max_retries - attempt - 1} attempts remaining)")
            else:
                raise
    
    # All retries exhausted
    error_msg = (
        f"Failed to generate valid enhancement after {max_retries} attempts. "
        "The LLM could not produce a prompt that passed verification. "
        "Please try again or check that your original prompt is clear and well-formed."
    )
    logger.error(error_msg)
    raise EnhancementValidationError(error_msg)
