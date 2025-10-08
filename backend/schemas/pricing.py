"""Pricing rules related Pydantic models"""
from pydantic import BaseModel
from typing import Optional, List


class PricingRuleCreate(BaseModel):
    location: Optional[str] = None
    venue: Optional[str] = None
    hall: Optional[str] = None
    start_date: Optional[str] = None  # YYYY.MM.DD 형식
    end_date: Optional[str] = None    # YYYY.MM.DD 형식
    brand: Optional[str] = None
    album: Optional[str] = None
    price: int
    description: Optional[str] = None
    is_active: bool = True


class PricingRuleUpdate(BaseModel):
    location: Optional[str] = None
    venue: Optional[str] = None
    hall: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    brand: Optional[str] = None
    album: Optional[str] = None
    price: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ApplyPricingRulesRequest(BaseModel):
    rule_ids: Optional[List[int]] = None
    schedule_ids: Optional[List[int]] = None
