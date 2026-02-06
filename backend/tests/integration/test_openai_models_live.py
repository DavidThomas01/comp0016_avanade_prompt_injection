import pytest
import os

from infra.providers.openai_provider import OpenAIProvider
from domain.providers.base_provider import *

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_GPT51_KEY"),
    reason="Missing API key"
)
async def test_gpt51_live_call():
    provider = OpenAIProvider()

    response = await provider.generate(
        ModelRequest(
            model="gpt-5.1",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_GPT52_KEY"),
    reason="Missing API key"
)
async def test_gpt52_live_call():
    provider = OpenAIProvider()

    response = await provider.generate(
        ModelRequest(
            model="gpt-5.1",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    

@pytest.mark.skipif(
    not os.getenv("FOUNDRY_O4NANO_KEY"),
    reason="Missing API key"
)
@pytest.mark.integration
async def test_o4nano_live_call():
    provider = OpenAIProvider()

    response = await provider.generate(
        ModelRequest(
            model="o4-nano",
            temperature=1,
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0

