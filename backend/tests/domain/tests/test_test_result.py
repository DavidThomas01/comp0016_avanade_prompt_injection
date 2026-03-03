from datetime import datetime

from domain.tests.test_result import TestResult


class TestTestResult:
    """Tests for TestResult domain entity"""

    def test_create_test_result(self):
        """TestResult can be created with all fields"""
        started = datetime(2026, 2, 25, 10, 0, 0)
        finished = datetime(2026, 2, 25, 10, 0, 5)
        
        result = TestResult(
            output={"response": "Hello, world!"},
            analysis={"passed": True, "score": 0.95},
            started_at=started,
            finished_at=finished
        )
        
        assert result.output == {"response": "Hello, world!"}
        assert result.analysis == {"passed": True, "score": 0.95}
        assert result.started_at == started
        assert result.finished_at == finished

    def test_test_result_with_string_output(self):
        """TestResult can have string output"""
        started = datetime(2026, 2, 25, 10, 0, 0)
        finished = datetime(2026, 2, 25, 10, 0, 5)
        
        result = TestResult(
            output="Simple text response",
            analysis="Analysis text",
            started_at=started,
            finished_at=finished
        )
        
        assert result.output == "Simple text response"
        assert result.analysis == "Analysis text"

    def test_test_result_with_none_values(self):
        """TestResult can have None for output/analysis"""
        started = datetime(2026, 2, 25, 10, 0, 0)
        finished = datetime(2026, 2, 25, 10, 0, 5)
        
        result = TestResult(
            output=None,
            analysis=None,
            started_at=started,
            finished_at=finished
        )
        
        assert result.output is None
        assert result.analysis is None
