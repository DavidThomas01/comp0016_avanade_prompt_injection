import pytest
import os

from infra.providers.openai_compatible_provider import OpenAICompatibleProvider
from domain.providers.base_provider import *


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_LLAMA_KEY"),
    reason="Missing API key"
)
async def test_llama_live_call():
    provider = OpenAICompatibleProvider()

    response = await provider.generate(
        ModelRequest(
            model="llama",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    
    
@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_PHI_KEY"),
    reason="Missing API key"
)
async def test_phi_live_call():
    provider = OpenAICompatibleProvider()

    response = await provider.generate(
        ModelRequest(
            model="phi",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_DEEPSEEK_KEY"),
    reason="Missing API key"
)
async def test_deepseek_live_call():
    provider = OpenAICompatibleProvider()

    response = await provider.generate(
        ModelRequest(
            model="deepseek",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_MISTRAL_KEY"),
    reason="Missing API key"
)
async def test_deepseek_live_call():
    provider = OpenAICompatibleProvider()

    response = await provider.generate(
        ModelRequest(
            model="mistral",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    