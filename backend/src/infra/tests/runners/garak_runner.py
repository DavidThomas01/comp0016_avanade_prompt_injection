import uuid
from pathlib import Path


class GarakRunner:

    BASE_OUTPUT = Path("./garak_runs")

    def run(self, model, test):

        try:
            from garak import harness, config
        except ImportError:
            raise RuntimeError(
                "garak is not installed. Run: pip install garak"
            )

        run_id = uuid.uuid4().hex[:8]
        run_dir = self.BASE_OUTPUT / f"{test.id}_{run_id}"
        run_dir.mkdir(parents=True, exist_ok=True)

        # --- configure garak ---
        config.system.model_type = model.spec.type
        config.system.model_name = model.spec.name
        config.system.output_dir = str(run_dir)

        # runner probes come from RunnerSpec
        if hasattr(test.runner, "probes"):
            config.system.probes = test.runner.probes

        config.system.generations = 1

        # --- execute ---
        harness.run()

        # --- read result ---
        report = self._latest_json(run_dir)

        return {
            "framework": "garak",
            "report_path": str(report),
        }

    def _latest_json(self, directory: Path) -> Path:
        files = list(directory.glob("*.json"))
        if not files:
            raise RuntimeError("No garak report generated")

        return max(files, key=lambda f: f.stat().st_mtime)