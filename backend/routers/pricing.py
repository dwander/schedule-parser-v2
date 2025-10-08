from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import Optional, List
import logging

from database import SessionLocal, PricingRule, Schedule

router = APIRouter()
logger = logging.getLogger(__name__)


# Data Models
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


# --- API Endpoints ---

@router.get("/api/pricing/rules")
async def get_pricing_rules(user_id: str = Query(...)):
    """사용자의 모든 단가 규칙 조회"""
    db_session = SessionLocal()
    try:
        rules = db_session.query(PricingRule).filter(
            PricingRule.user_id == user_id
        ).order_by(PricingRule.priority.desc(), PricingRule.id).all()

        return [rule.to_dict() for rule in rules]

    except Exception as e:
        logger.error(f"❌ Get pricing rules error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_session.close()


@router.post("/api/pricing/rules")
async def create_pricing_rule(
    rule_data: PricingRuleCreate,
    user_id: str = Query(...)
):
    """새로운 단가 규칙 생성"""
    db_session = SessionLocal()
    try:
        # 우선순위 계산 (구체적일수록 높음)
        priority = 0
        if rule_data.location: priority += 1
        if rule_data.venue: priority += 1
        if rule_data.hall: priority += 1
        if rule_data.brand: priority += 1
        if rule_data.album: priority += 1
        if rule_data.start_date: priority += 1
        if rule_data.end_date: priority += 1

        # 규칙 생성
        new_rule = PricingRule(
            user_id=user_id,
            location=rule_data.location,
            venue=rule_data.venue,
            hall=rule_data.hall,
            start_date=rule_data.start_date,
            end_date=rule_data.end_date,
            brand=rule_data.brand,
            album=rule_data.album,
            price=rule_data.price,
            description=rule_data.description,
            priority=priority,
            is_active=rule_data.is_active
        )

        db_session.add(new_rule)
        db_session.commit()
        db_session.refresh(new_rule)

        return new_rule.to_dict()

    except Exception as e:
        db_session.rollback()
        logger.error(f"❌ Create pricing rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_session.close()


@router.put("/api/pricing/rules/{rule_id}")
async def update_pricing_rule(
    rule_id: int,
    rule_data: PricingRuleUpdate,
    user_id: str = Query(...)
):
    """단가 규칙 수정"""
    db_session = SessionLocal()
    try:
        rule = db_session.query(PricingRule).filter(
            PricingRule.id == rule_id,
            PricingRule.user_id == user_id
        ).first()

        if not rule:
            raise HTTPException(status_code=404, detail="단가 규칙을 찾을 수 없습니다.")

        # 업데이트
        update_data = rule_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(rule, field, value)

        # 우선순위 재계산
        priority = 0
        if rule.location: priority += 1
        if rule.venue: priority += 1
        if rule.hall: priority += 1
        if rule.brand: priority += 1
        if rule.album: priority += 1
        if rule.start_date: priority += 1
        if rule.end_date: priority += 1
        rule.priority = priority

        db_session.commit()
        db_session.refresh(rule)

        return rule.to_dict()

    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"❌ Update pricing rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_session.close()


@router.delete("/api/pricing/rules/{rule_id}")
async def delete_pricing_rule(
    rule_id: int,
    user_id: str = Query(...)
):
    """단가 규칙 삭제"""
    db_session = SessionLocal()
    try:
        rule = db_session.query(PricingRule).filter(
            PricingRule.id == rule_id,
            PricingRule.user_id == user_id
        ).first()

        if not rule:
            raise HTTPException(status_code=404, detail="단가 규칙을 찾을 수 없습니다.")

        db_session.delete(rule)
        db_session.commit()

        return {"message": "단가 규칙이 삭제되었습니다."}

    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"❌ Delete pricing rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_session.close()


@router.post("/api/pricing/apply")
async def apply_pricing_rules(
    request: ApplyPricingRulesRequest = Body(...),
    user_id: str = Query(...)
):
    """
    단가 규칙을 스케줄에 적용
    rule_ids: 적용할 규칙 ID 목록 (없으면 모든 활성 규칙)
    schedule_ids: 대상 스케줄 ID 목록 (없으면 모든 스케줄)
    """
    db_session = SessionLocal()
    try:
        # 규칙 가져오기
        query = db_session.query(PricingRule).filter(
            PricingRule.user_id == user_id,
            PricingRule.is_active == True
        )

        if request.rule_ids:
            query = query.filter(PricingRule.id.in_(request.rule_ids))

        rules = query.order_by(PricingRule.priority.desc()).all()

        if not rules:
            raise HTTPException(status_code=400, detail="적용할 단가 규칙이 없습니다.")

        # 대상 스케줄 가져오기
        schedule_query = db_session.query(Schedule).filter(Schedule.user_id == user_id)
        if request.schedule_ids:
            schedule_query = schedule_query.filter(Schedule.id.in_(request.schedule_ids))
        schedules = schedule_query.all()

        updated_count = 0

        for schedule in schedules:
            # 매칭되는 최우선 규칙 찾기
            for rule in rules:
                match = True

                # 각 조건 체크 (키워드 매칭)
                if rule.location and rule.location not in (schedule.location or ''):
                    match = False
                if rule.venue and rule.venue not in (schedule.location or ''):
                    match = False
                if rule.hall and rule.hall not in (schedule.location or ''):
                    match = False
                if rule.brand and schedule.brand != rule.brand:
                    match = False
                if rule.album and schedule.album != rule.album:
                    match = False

                # 날짜 범위 체크 (한쪽만 있는 경우도 처리)
                if schedule.date:
                    if rule.start_date and not rule.end_date:
                        # 시작일만 설정: 해당 날짜 이후만 매칭
                        if schedule.date < rule.start_date:
                            match = False
                    elif rule.end_date and not rule.start_date:
                        # 종료일만 설정: 해당 날짜 이전만 매칭
                        if schedule.date > rule.end_date:
                            match = False
                    elif rule.start_date and rule.end_date:
                        # 시작일과 종료일 모두 설정: 범위 내만 매칭
                        if not (rule.start_date <= schedule.date <= rule.end_date):
                            match = False

                if match:
                    # 가격 업데이트
                    schedule.price = rule.price
                    updated_count += 1
                    break  # 첫 번째 매칭 규칙만 적용

        db_session.commit()

        return {
            "message": f"{updated_count}개의 스케줄에 단가가 적용되었습니다.",
            "updated_count": updated_count
        }

    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"❌ Apply pricing rules error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_session.close()
