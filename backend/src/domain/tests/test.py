from dataclasses import dataclass, replace
from datetime import datetime
from typing import Optional
import uuid

from .model_spec import ModelSpec
from .environment_spec import EnvironmentSpec
from .runner_spec import RunnerSpec

def new_test_id() -> str:
    return f"test_{uuid.uuid4().hex[:10]}"

@dataclass(frozen=True)
class Test:
    id: str
    name: str
    model: ModelSpec
    environment: Optional[EnvironmentSpec]
    runner: RunnerSpec
    created_at: datetime
    parent_id: Optional[str] = None  # for versioning

    @staticmethod
    def create(
        name: str,
        model: ModelSpec,
        environment: Optional[EnvironmentSpec],
        runner: RunnerSpec,
    ) -> "Test":
        Test._validate(model=model, environment=environment, runner=runner)

        return Test(
            id=new_test_id(),
            name=name,
            model=model,
            environment=environment,
            runner=runner,
            created_at=datetime.utcnow(),
            parent_id=None,
        )

    def derive(
        self,
        *,
        name: Optional[str] = None,
        model: Optional[ModelSpec] = None,
        environment: Optional[EnvironmentSpec] = None,
        runner: Optional[RunnerSpec] = None,
    ) -> "Test":
        """
        Create a new version of this test with modifications.
        Old test remains unchanged.
        """
        new_model = model or self.model
        new_env = environment if environment is not None else self.environment
        new_runner = runner or self.runner

        Test._validate(model=new_model, environment=new_env, runner=new_runner)

        return Test(
            id=new_test_id(),
            name=name or self.name,
            model=new_model,
            environment=new_env,
            runner=new_runner,
            created_at=datetime.utcnow(),
            parent_id=self.id,
        )

    @staticmethod
    def _validate(
        *,
        model: ModelSpec,
        environment: Optional[EnvironmentSpec],
        runner: RunnerSpec,
    ) -> None:
        model.validate()
        runner.validate()

        if model.type == "external":
            if environment is not None:
                raise ValueError("external model cannot include environment")
            return

        if environment is None:
            raise ValueError("platform model requires environment")

        environment.validate()
