from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from domain.providers.message import Message
from domain.tests.environment_spec import EnvironmentSpec
from domain.tests.model_spec import ModelSpec
from domain.tests.runner_spec import RunnerSpec
from domain.tests.test import Test
from domain.tests.test_result import TestResult
from infra.tests.runners.framework_runner import FrameworkRunner


@pytest.mark.asyncio
async def test_framework_runner_delegates_to_garak_runner():
    test = Test.create(
        name="Framework Test",
        model=ModelSpec.create_platform(model_id="gpt-5.2"),
        environment=EnvironmentSpec.create_from_system_prompt("You are helpful."),
        runner=RunnerSpec.create_framework(),
    )
    expected = TestResult(
        output="garak output",
        analysis={"flagged": False, "score": 0.0, "reason": "ok"},
        started_at=datetime.now(),
        finished_at=datetime.now(),
    )

    with patch("infra.tests.runners.framework_runner.GarakRunner") as mock_runner_cls:
        mock_runner = mock_runner_cls.return_value
        mock_runner.run = AsyncMock(return_value=expected)

        result = await FrameworkRunner().run(test, Message(role="user", content="run"))

    mock_runner.run.assert_called_once()
    assert result == expected