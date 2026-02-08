import pytest
import os

from infra.providers.anthropic_provider import AnthropicProvider
from domain.providers.base_provider import *


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_CLAUDESONNET45_KEY"),
    reason="Missing API key"
)
async def test_claudesonnet45_live_call():
    provider = AnthropicProvider()
    
    response = await provider.generate(
        ModelRequest(
            model="claude-sonnet-4-5",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_CLAUDEHAIKU45_KEY"),
    reason="Missing API key"
)
async def test_claudehaiku45_live_call():
    provider = AnthropicProvider()
    
    response = await provider.generate(
        ModelRequest(
            model="claude-haiku-4-5",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
    

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_CLAUDEOPUS41_KEY"),
    reason="Missing API key"
)
async def test_claudeopus41_live_call():
    provider = AnthropicProvider()
    
    response = await provider.generate(
        ModelRequest(
            model="claude-opus-4-1",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0