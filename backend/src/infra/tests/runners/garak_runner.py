import uuid
from pathlib import Path
from typing import Optional
from domain.tests import TestRunner, Test, TestResult
from domain.providers import Message


class GarakRunner(TestRunner):

    BASE_OUTPUT = Path("./garak_runs")

    async def run(self, test: Test, prompt: Optional[Message]) -> TestResult:

        try:
            from garak import harness, config
        except ImportError:
            raise RuntimeError(
                "garak is not installed. Run: pip install garak"
            )

        run_id = uuid.uuid4().hex[:8]
        run_dir = self.BASE_OUTPUT / f"{test.id}_{run_id}"
        run_dir.mkdir(parents=True, exist_ok=True)

        config.system.model_type = test.model.type
        config.system.model_name = test.model.model_id
        config.system.output_dir = str(run_dir)

        if hasattr(test.runner, "probes"):
            config.system.probes = test.runner.probes

        config.system.generations = 1

        harness.run()

        report = self._latest_json(run_dir)
        
        from datetime import datetime
        return TestResult(
            output={
                "framework": "garak",
                "report_path": str(report),
            },
            analysis=None,
            started_at=datetime.now(),
            finished_at=datetime.now()
        )

    def _latest_json(self, directory: Path) -> Path:
        files = list(directory.glob("*.json"))
        if not files:
            raise RuntimeError("No garak report generated")

        return max(files, key=lambda f: f.stat().st_mtime)