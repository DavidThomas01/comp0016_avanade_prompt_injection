from typing import Any


def __getattr__(name: str) -> Any:
    if name == "ProviderRouter":
        from .provider_router import ProviderRouter
        return ProviderRouter

    if name == "RunnerRouter":
        from .runner_router import RunnerRouter
        return RunnerRouter

    raise AttributeError(f"module 'app.routers' has no attribute '{name}'")


__all__ = [
    "ProviderRouter",
    "RunnerRouter"
]