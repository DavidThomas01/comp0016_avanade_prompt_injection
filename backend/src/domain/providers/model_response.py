from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any


@dataclass
class ModelResponse:
    text: str
    raw: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)