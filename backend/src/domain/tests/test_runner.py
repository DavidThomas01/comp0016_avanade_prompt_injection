from abc import ABC, abstractmethod
from .test import Test
from .test_result import TestResult

class TestRunner(ABC):
    
    @abstractmethod
    def run(self, test: Test) -> TestResult:
        pass