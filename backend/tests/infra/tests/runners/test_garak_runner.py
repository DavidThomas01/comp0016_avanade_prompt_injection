import json
import subprocess
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import pytest

from core.exceptions import InvalidModelConfiguration
from domain.providers.message import Message
from domain.tests.environment_spec import EnvironmentSpec
from domain.tests.model_spec import ModelSpec
from domain.tests.runner_spec import RunnerSpec
from domain.tests.test import Test
from infra.tests.runners.garak_runner import GarakRunner


def make_platform_test(model_id: str = "gpt-5.2") -> Test:
    return Test.create(
        name="Framework Test",
        model=ModelSpec.create_platform(model_id=model_id),
        environment=EnvironmentSpec.create_from_system_prompt("You are helpful."),
        runner=RunnerSpec.create_framework(),
    )


def make_external_test() -> Test:
    return Test(
        id="test_external",
        name="External Framework Test",
        model=ModelSpec.create_external(endpoint="https://api.example.com"),
        environment=None,
        runner=RunnerSpec.create_framework(),
        created_at=datetime.now(),
    )


class TestGarakRunner:
    @pytest.mark.asyncio
    async def test_run_rejects_external_models(self, tmp_path: Path):
        runner = GarakRunner()
        runner.BASE_OUTPUT = tmp_path

        with pytest.raises(InvalidModelConfiguration, match="platform model"):
            await runner.run(make_external_test(), Message(role="user", content="run"))

    @pytest.mark.asyncio
    async def test_run_requires_garak_executable(self, tmp_path: Path):
        runner = GarakRunner()
        runner.BASE_OUTPUT = tmp_path

        with patch("infra.tests.runners.garak_runner.shutil.which", return_value=None):
            with pytest.raises(RuntimeError, match="garak executable not found"):
                await runner.run(make_platform_test(), Message(role="user", content="run"))

    def test_resolve_probe_spec_returns_default_when_none(self):
        runner = GarakRunner()
        assert runner._resolve_probe_spec(None) == GarakRunner.DEFAULT_PROBE_SPEC

    def test_resolve_probe_spec_returns_default_when_bare_namespace(self):
        runner = GarakRunner()
        assert runner._resolve_probe_spec("promptinject") == GarakRunner.DEFAULT_PROBE_SPEC
        assert runner._resolve_probe_spec("dan") == GarakRunner.DEFAULT_PROBE_SPEC
        assert runner._resolve_probe_spec("lmrc") == GarakRunner.DEFAULT_PROBE_SPEC

    def test_resolve_probe_spec_returns_full_dotted_spec_unchanged(self):
        runner = GarakRunner()
        assert runner._resolve_probe_spec("promptinject.HijackHateHumans") == "promptinject.HijackHateHumans"
        assert runner._resolve_probe_spec("dan.AutoDANCached") == "dan.AutoDANCached"
        assert runner._resolve_probe_spec("lmrc.Profanity") == "lmrc.Profanity"

    def test_resolve_probe_spec_allows_comma_separated_custom_specs(self):
        runner = GarakRunner()
        spec = "encoding.InjectBase64,dan.DanInTheWild"
        assert runner._resolve_probe_spec(spec) == spec

    def test_build_generator_options_for_openai_model(self):
        runner = GarakRunner()
        options = runner._build_generator_options(type("Config", (), {
            "provider": "openai",
            "endpoint": "https://example.com/openai/responses?api-version=2025-04-01-preview",
            "api_key": "FOO_KEY",
            "model_name": "gpt-5.2",
            "display_name": "gpt-5.2",
        })())

        assert options["headers"]["api-key"] == "$KEY"
        assert options["key_env_var"] == "FOO_KEY"
        assert options["skip_codes"] == [400]
        assert options["response_json_field"] == "$.output[0].content[0].text"
        template = options["req_template_json_object"]
        assert template["model"] == "gpt-5.2"
        assert template["input"][0]["content"] == "$INPUT"

    def test_build_generator_options_for_anthropic_model(self):
        runner = GarakRunner()
        options = runner._build_generator_options(type("Config", (), {
            "provider": "anthropic",
            "endpoint": "https://example.com/anthropic/v1/messages",
            "api_key": "BAR_KEY",
            "model_name": "claude-sonnet-4-5",
            "display_name": "claude-sonnet-4-5",
        })())

        assert options["headers"]["x-api-key"] == "$KEY"
        assert options["response_json_field"] == "$.content[0].text"
        template = options["req_template_json_object"]
        assert template["model"] == "claude-sonnet-4-5"
        assert template["messages"][0]["content"] == "$INPUT"

    def test_build_generator_options_for_azure_deployment_chat_completions(self):
        runner = GarakRunner()
        options = runner._build_generator_options(type("Config", (), {
            "provider": "openai",
            "endpoint": "https://example.openai.azure.com/openai/deployments/gpt-5-nano/chat/completions?api-version=2025-01-01-preview",
            "api_key": "BAZ_KEY",
            "model_name": "gpt-5-nano",
            "display_name": "gpt-5-nano",
        })())

        template = options["req_template_json_object"]
        assert "model" not in template
        assert template["messages"][0]["content"] == "$INPUT"
        assert options["response_json_field"] == "$.choices[0].message.content"

    @pytest.mark.asyncio
    async def test_run_success_returns_summary_string_and_analysis(self, tmp_path: Path):
        runner = GarakRunner()
        runner.BASE_OUTPUT = tmp_path
        captured_command = {}

        def fake_subprocess_run(*args, **kwargs):
            captured_command["argv"] = args[0]
            report_prefix = Path(args[0][args[0].index("--report_prefix") + 1])
            report_prefix.with_suffix(".report.jsonl").write_text(
                '\n'.join([
                    json.dumps({"entry_type": "start_run setup"}),
                    json.dumps({
                        "entry_type": "digest",
                        "meta": {"run_uuid": "run-123"},
                        "eval": {
                            "ansiescape": {
                                "_summary": {},
                                "ansiescape.AnsiRaw": {
                                    "_summary": {},
                                    "ansiescape.Raw": {"detector_defcon": 3},
                                },
                            },
                        },
                    }),
                ]),
                encoding="utf-8",
            )
            report_prefix.with_suffix(".report.html").write_text("<html></html>", encoding="utf-8")
            return subprocess.CompletedProcess(args[0], 0, stdout="ok", stderr="")

        with patch.dict("os.environ", {"FOUNDRY_GPT52_KEY": "secret"}, clear=False), \
             patch("infra.tests.runners.garak_runner.shutil.which", return_value="/usr/local/bin/garak"), \
             patch("infra.tests.runners.garak_runner.subprocess.run", side_effect=fake_subprocess_run):
            result = await runner.run(make_platform_test(), Message(role="user", content="run"))

        argv = captured_command["argv"]
        report_prefix_arg = argv[argv.index("--report_prefix") + 1]
        assert Path(report_prefix_arg).is_absolute()
        probes_arg = argv[argv.index("--probes") + 1]
        assert probes_arg == "dan.AutoDANCached"

        options_json = argv[argv.index("--generator_options") + 1]
        options = json.loads(options_json)
        assert options["rest"]["RestGenerator"]["uri"].startswith("https://")
        assert options["rest"]["RestGenerator"]["response_json"] is True

        assert "Garak scan completed" in result.output
        assert "JSONL report:" in result.output
        assert result.analysis["flagged"] is True
        assert result.analysis["score"] == 0.5
        assert isinstance(result.started_at, datetime)
        assert isinstance(result.finished_at, datetime)

    @pytest.mark.asyncio
    async def test_run_raises_runtime_error_on_nonzero_exit(self, tmp_path: Path):
        runner = GarakRunner()
        runner.BASE_OUTPUT = tmp_path

        with patch.dict("os.environ", {"FOUNDRY_GPT52_KEY": "secret"}, clear=False), \
             patch("infra.tests.runners.garak_runner.shutil.which", return_value="/usr/local/bin/garak"), \
             patch(
                 "infra.tests.runners.garak_runner.subprocess.run",
                 return_value=subprocess.CompletedProcess(["garak"], 1, stdout="", stderr="boom"),
             ):
            with pytest.raises(RuntimeError, match="garak scan failed"):
                await runner.run(make_platform_test(), Message(role="user", content="run"))

    @pytest.mark.asyncio
    async def test_run_finds_report_from_garak_stdout(self, tmp_path: Path):
        runner = GarakRunner()
        runner.BASE_OUTPUT = tmp_path

        def fake_subprocess_run(*args, **kwargs):
            report_prefix = Path(args[0][args[0].index("--report_prefix") + 1])
            garak_data_dir = tmp_path / "garak_data"
            garak_data_dir.mkdir(parents=True, exist_ok=True)
            discovered_report = garak_data_dir / "garak.run-123.report.jsonl"
            discovered_report.write_text(
                '\n'.join([
                    json.dumps({"entry_type": "start_run setup"}),
                    json.dumps({
                        "entry_type": "digest",
                        "meta": {"run_uuid": "run-123"},
                        "eval": {},
                    }),
                ]),
                encoding="utf-8",
            )
            discovered_report.with_suffix(".html").write_text("<html></html>", encoding="utf-8")
            stdout = f"📜 reporting to {discovered_report}\n"
            return subprocess.CompletedProcess(args[0], 0, stdout=stdout, stderr="")

        with patch.dict("os.environ", {"FOUNDRY_GPT52_KEY": "secret"}, clear=False), \
             patch("infra.tests.runners.garak_runner.shutil.which", return_value="/usr/local/bin/garak"), \
             patch("infra.tests.runners.garak_runner.subprocess.run", side_effect=fake_subprocess_run):
            result = await runner.run(make_platform_test(), Message(role="user", content="run"))

        assert "JSONL report:" in result.output

    @pytest.mark.asyncio
    async def test_run_raises_actionable_error_on_incomplete_report(self, tmp_path: Path):
        runner = GarakRunner()
        runner.BASE_OUTPUT = tmp_path

        def fake_subprocess_run(*args, **kwargs):
            report_prefix = Path(args[0][args[0].index("--report_prefix") + 1])
            report_prefix.with_suffix(".report.jsonl").write_text(
                '\n'.join([
                    json.dumps({"entry_type": "start_run setup"}),
                    json.dumps({"entry_type": "init", "run": "run-123"}),
                ]),
                encoding="utf-8",
            )
            return subprocess.CompletedProcess(
                args[0],
                0,
                stdout="No probes selected by current filter",
                stderr="",
            )

        with patch.dict("os.environ", {"FOUNDRY_GPT52_KEY": "secret"}, clear=False), \
             patch("infra.tests.runners.garak_runner.shutil.which", return_value="/usr/local/bin/garak"), \
             patch("infra.tests.runners.garak_runner.subprocess.run", side_effect=fake_subprocess_run), \
             patch.object(GarakRunner, "_ensure_digest_in_report"):
            with pytest.raises(RuntimeError, match="incomplete report") as exc:
                await runner.run(make_platform_test(), Message(role="user", content="run"))

        assert "No probes selected" in str(exc.value)

    @pytest.mark.asyncio
    async def test_run_generates_digest_when_garak_skips_all_probes(self, tmp_path: Path):
        runner = GarakRunner()
        runner.BASE_OUTPUT = tmp_path

        def fake_subprocess_run(*args, **kwargs):
            report_prefix = Path(args[0][args[0].index("--report_prefix") + 1])
            report_prefix.with_suffix(".report.jsonl").write_text(
                '\n'.join([
                    json.dumps({"entry_type": "start_run setup"}),
                    json.dumps({"entry_type": "init", "run": "run-skip"}),
                ]),
                encoding="utf-8",
            )
            return subprocess.CompletedProcess(args[0], 0, stdout="", stderr="")

        def write_digest(report_jsonl: Path) -> None:
            with report_jsonl.open("a", encoding="utf-8") as f:
                f.write('\n' + json.dumps({
                    "entry_type": "digest",
                    "meta": {"run_uuid": "run-skip"},
                    "eval": {},
                }) + '\n')

        with patch.dict("os.environ", {"FOUNDRY_GPT52_KEY": "secret"}, clear=False), \
             patch("infra.tests.runners.garak_runner.shutil.which", return_value="/usr/local/bin/garak"), \
             patch("infra.tests.runners.garak_runner.subprocess.run", side_effect=fake_subprocess_run), \
             patch.object(GarakRunner, "_ensure_digest_in_report", side_effect=write_digest):
            result = await runner.run(make_platform_test(), Message(role="user", content="run"))

        assert result.analysis["score"] == 0.0
        assert result.analysis["flagged"] is False
        assert "Garak scan completed" in result.output