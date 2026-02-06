import pytest

from infra.providers.openai_provider import OpenAIProvider
from domain.providers.base_provider import *

@pytest.mark.integration
async def test_openai_live_call():
    provider = OpenAIProvider()

    response = await provider.generate(
        ModelRequest(
            model="gpt-5.2",
            messages=[Message(role="user", content="Say hello")]
        )
    )

    assert response.text is not None
    assert len(response.text) > 0
