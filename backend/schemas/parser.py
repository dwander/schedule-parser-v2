"""Parser related Pydantic models"""
from pydantic import BaseModel


class ParseTextRequest(BaseModel):
    text: str
    engine: str = "hybrid"  # classic, hybrid, ai_only
