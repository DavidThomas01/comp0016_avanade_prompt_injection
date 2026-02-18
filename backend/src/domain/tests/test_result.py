from dataclasses import dataclass
from typing import Any
from datetime import datetime

@dataclass
class TestResult:
    output: Any
    started_at: datetime
    finished_at: datetime
    