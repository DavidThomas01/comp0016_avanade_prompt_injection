import pathlib
import sys

# Ensure backend/src is on sys.path so ``import domain.*`` etc. work
# regardless of how pytest resolves the ``pythonpath`` ini option.
_SRC = str(pathlib.Path(__file__).resolve().parent.parent / "src")
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from dotenv import load_dotenv
import pytest

load_dotenv()

def pytest_addoption(parser):
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="Run live integration tests",
    )


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "integration: mark test as requiring live API",
    )


def pytest_collection_modifyitems(config, items):
    if config.getoption("--run-integration"):
        return

    skip_integration = pytest.mark.skip(
        reason="need --run-integration flag to run"
    )

    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip_integration)
