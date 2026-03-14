from dataclasses import dataclass, field
from typing import Any, Optional, List
from datetime import datetime

@dataclass
class TestResult:
    output: Any
    analysis: Any
    started_at: datetime
    finished_at: datetime
    report_html_url: Optional[str] = field(default=None)
    attempts: Optional[List[Any]] = field(default=None)
    