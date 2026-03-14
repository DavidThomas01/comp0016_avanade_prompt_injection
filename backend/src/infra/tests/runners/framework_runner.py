from typing import Optional
from infra.tests.runners.garak_runner import GarakRunner
from domain.tests import TestRunner, Test, TestResult
from domain.providers import Message


class FrameworkRunner(TestRunner):

    async def run(self, test: Test, prompt: Optional[Message]) -> TestResult:
        garak = GarakRunner()
        return await garak.run(test, prompt)