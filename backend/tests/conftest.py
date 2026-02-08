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
