from pydantic import BaseModel, Field
from typing import List, Dict, Any


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="User input text to analyze")


class PolicyResult(BaseModel):
    decision: str
    risk_level: str
    risk_score: int
    matched_rules: List[str]
    pii_hits: List[str]
    keyword_hits: List[str]
    redacted_text: str


class AnalyzeResponse(BaseModel):
    user: Dict[str, Any]
    policy_result: PolicyResult