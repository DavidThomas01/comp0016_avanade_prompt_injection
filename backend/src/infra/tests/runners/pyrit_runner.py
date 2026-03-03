from typing import Optional
from domain.tests import TestRunner, Test, TestResult
from domain.providers import Message
from datetime import datetime

class PyritRunner(TestRunner):

    async def run(self, test: Test, prompt: Optional[Message]) -> TestResult:
        return TestResult(
            output={"framework": "pyrit", "status": "completed"},
            analysis=None,
            started_at=datetime.now(),
            finished_at=datetime.now()
        )