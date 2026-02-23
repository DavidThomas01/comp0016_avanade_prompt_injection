from abc import ABC, abstractmethod
from typing import Optional
from .test import Test
from .test_result import TestResult
from domain.providers import Message

class TestRunner(ABC):
    
    @abstractmethod
    async def run(self, test: Test, prompt: Optional[Message]) -> TestResult:
        pass