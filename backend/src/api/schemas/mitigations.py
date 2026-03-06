from typing import List
from pydantic import BaseModel


class MitigationResponse(BaseModel):
    id: str
    label: str
    layer: str


class GetMitigationsResponse(BaseModel):
    mitigations: List[MitigationResponse]