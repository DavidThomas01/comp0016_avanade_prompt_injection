from typing import Optional
from infra.tests.runners.pyrit_runner import PyritRunner
from infra.tests.runners.garak_runner import GarakRunner
from domain.tests import TestRunner, Test, TestResult
from domain.providers import Message
from datetime import datetime


class FrameworkRunner(TestRunner):

    async def run(self, test: Test, prompt: Optional[Message]) -> TestResult:

        pyrit = PyritRunner()
        garak = GarakRunner()

        pyrit_results = await pyrit.run(test, prompt)
        garak_results = await garak.run(test, prompt)

        return TestResult(
            output={
                "pyrit": pyrit_results,
                "garak": garak_results,
            },
            analysis=None,
            started_at=datetime.now(),
            finished_at=datetime.now()
        )