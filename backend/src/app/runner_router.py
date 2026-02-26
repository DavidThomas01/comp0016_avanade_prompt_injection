from infra.tests.runners.registry import resolve_runner
from domain.tests import *
from domain.providers import Message
from typing import Optional

class RunnerRouter:
    """
    Resolves a test to a runner and delegates execution.

    This layer centralizes test -> runner routing so that API handlers,
    and test services never need to know provider details.
    """

    async def run(self, test: Test, message: Optional[Message] = None) -> TestResult:
        runner: TestRunner = resolve_runner(test.runner.type)

        result = await runner.run(test, message)
        
        return result