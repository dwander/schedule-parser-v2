"""Pydantic schemas for API request/response models"""

# Auth schemas
from schemas.auth import (
    GoogleAuthRequest,
    GoogleTokenRequest,
    NaverAuthRequest,
    KakaoAuthRequest,
)

# Naver schemas
from schemas.naver import NaverCalendarRequest

# Parser schemas
from schemas.parser import ParseTextRequest

# Pricing schemas
from schemas.pricing import (
    PricingRuleCreate,
    PricingRuleUpdate,
    ApplyPricingRulesRequest,
)

# Storage schemas
from schemas.storage import (
    SaveSchedulesRequest,
    LoadSchedulesRequest,
    PersistentSaveRequest,
    PersistentLoadRequest,
)

__all__ = [
    # Auth
    "GoogleAuthRequest",
    "GoogleTokenRequest",
    "NaverAuthRequest",
    "KakaoAuthRequest",
    # Naver
    "NaverCalendarRequest",
    # Parser
    "ParseTextRequest",
    # Pricing
    "PricingRuleCreate",
    "PricingRuleUpdate",
    "ApplyPricingRulesRequest",
    # Storage
    "SaveSchedulesRequest",
    "LoadSchedulesRequest",
    "PersistentSaveRequest",
    "PersistentLoadRequest",
]
