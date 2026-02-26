from domain.tests import RunnerType
from .prompt_runner import PromptRunner
from .framework_runner import FrameworkRunner

from core.exceptions import UnknownRunner


_RUNNER_REGISTRY = {
    RunnerType.PROMPT: PromptRunner,
    RunnerType.FRAMEWORK: FrameworkRunner
}


def resolve_runner(type: RunnerType):
    runner_cls = _RUNNER_REGISTRY.get(type)
    
    if runner_cls is None:
        raise UnknownRunner(f"runner type not implemented: {runner_cls}")
    
    return runner_cls()
        
    