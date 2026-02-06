import pytest
import os

from infra.providers.anthropic_provider import AnthropicProvider
from domain.providers.base_provider import *


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FOUNDRY_CLAUDE_KEY"),
    reason="Missing API key"
)
async def test_claude_live_call():
    provider = AnthropicProvider()
    
    response = await provider.generate(
        ModelRequest(
            model="claude",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0