"""
OpenAI GPT-4.1-nano를 사용한 LLM 기반 스케줄 파서
Structured Outputs를 사용하여 JSON 스키마 강제
"""
import os
import logging
import time
from openai import OpenAI
from typing import Optional, Dict, Any
import json

logger = logging.getLogger(__name__)

# OpenAI 클라이언트 초기화
client = None

def init_openai_client():
    """OpenAI 클라이언트 초기화"""
    global client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not found in environment variables")
        return False

    try:
        client = OpenAI(api_key=api_key)
        logger.info("OpenAI client initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {e}")
        return False


# JSON Schema for structured output (배열 형태로 여러 스케줄 지원)
SCHEDULE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "wedding_schedules",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "schedules": {
                    "type": "array",
                    "description": "추출된 스케줄 목록",
                    "items": {
                        "type": "object",
                        "properties": {
                            "date": {
                                "type": "string",
                                "description": "날짜 (YYYY.MM.DD 형식)"
                            },
                            "time": {
                                "type": "string",
                                "description": "시간 (HH:MM 형식, 24시간제)"
                            },
                            "location": {
                                "type": "string",
                                "description": "예식장 또는 장소명"
                            },
                            "couple": {
                                "type": "string",
                                "description": "신랑신부 이름 (공백으로 분리, 예: 방희건 김가필)"
                            },
                            "contact": {
                                "type": "string",
                                "description": "연락처 (전화번호 또는 이메일)"
                            },
                            "brand": {
                                "type": "string",
                                "description": "브랜드 원본 텍스트 (예: K 세븐스, B 세븐스, A 세븐스프리미엄, 더그라피, 세컨플로우). 대괄호 제거"
                            },
                            "album": {
                                "type": "string",
                                "description": "앨범 종류"
                            },
                            "photographer": {
                                "type": "string",
                                "description": "작가 이름"
                            },
                            "cuts": {
                                "type": "integer",
                                "description": "컷수"
                            },
                            "price": {
                                "type": "integer",
                                "description": "촬영비 (숫자만, 원 단위)"
                            },
                            "manager": {
                                "type": "string",
                                "description": "담당자 또는 계약자 이름"
                            },
                            "memo": {
                                "type": "string",
                                "description": "기타 메모 사항"
                            }
                        },
                        "required": ["date", "time", "location", "couple", "contact", "brand", "album", "photographer", "cuts", "price", "manager", "memo"],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["schedules"],
            "additionalProperties": False
        }
    }
}


SYSTEM_PROMPT = """You are a wedding photography schedule parsing expert.

Extract **up to 3 schedules maximum** from Korean KakaoTalk messages and return as an array.

Extract these fields for each schedule:
- date: Convert to YYYY.MM.DD format
- time: HH:MM format (24-hour)
- location: Venue name
- couple: "Groom Bride" format (space-separated, NO heart symbols)
- contact: Phone number or email
- brand: Original text as-is (e.g., "K 세븐스", "B 세븐스", "A 세븐스프리미엄", "더그라피", "세컨플로우"). Remove brackets []. DO NOT abbreviate
- album: Album type (e.g., "30P", "기본30P")
- photographer: Photographer name
- cuts: Number only
- price: Number only (만원 → 10000)
- manager: Manager name (e.g., "w웨딩 장서영")
- memo: Other important info (선촬영, 폐백, 플래시컷, etc.)

Time conversion examples:
- "오후 2시" → "14:00"
- "낮 12시" → "12:00"
- "2시 30분" → "14:30"
- "오전 11시반" → "11:30"

Brand examples:
- "K [ 세븐스 ]" → "K 세븐스" (remove brackets only)
- "B 세븐스" → "B 세븐스" (keep as-is)
- "A 세븐스프리미엄" → "A 세븐스프리미엄" (keep as-is)

**IMPORTANT**:
- Extract all schedules found in the message and include in array
- **BUT limit to 3 schedules maximum**. If more than 3, return only the first 3
- Set empty string ("") or 0 for missing fields
"""


async def parse_with_llm(message: str) -> Optional[Dict[str, Any]]:
    """
    LLM을 사용하여 메시지 파싱 (최대 3개 스케줄, 2000자 제한)

    Args:
        message: 파싱할 카카오톡 메시지

    Returns:
        파싱된 스케줄 데이터 (실패 시 None)
    """
    global client

    # 클라이언트 초기화 확인
    if client is None:
        if not init_openai_client():
            logger.error("OpenAI client not available")
            return None

    # 텍스트 길이 제한 (2000자)
    MAX_LENGTH = 2000
    if len(message) > MAX_LENGTH:
        logger.warning(f"Message too long ({len(message)} chars), truncating to {MAX_LENGTH} chars")
        message = message[:MAX_LENGTH]

    try:
        logger.info(f"Parsing message with LLM (length: {len(message)} chars)")

        # 시작 시간 기록
        start_time = time.time()

        response = client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Parse this message:\n\n{message}"}
            ],
            response_format=SCHEDULE_SCHEMA,
            temperature=0  # 일관성을 위해 0으로 설정
        )

        # 종료 시간 계산
        elapsed_time = time.time() - start_time

        # 응답 파싱
        result_str = response.choices[0].message.content
        result = json.loads(result_str)

        # schedules 배열 추출 (최대 3개로 제한)
        schedules = result.get('schedules', [])
        if len(schedules) > 3:
            logger.warning(f"Parsed {len(schedules)} schedules, limiting to 3")
            schedules = schedules[:3]
        logger.info(f"Parsed {len(schedules)} schedule(s) from message")

        # 토큰 사용량 로깅 (비용 모니터링)
        usage = response.usage
        logger.info(f"LLM parsing successful - Tokens: input={usage.prompt_tokens}, output={usage.completion_tokens}, total={usage.total_tokens}")

        # 비용 계산 (GPT-4.1-nano 요금)
        input_cost = (usage.prompt_tokens / 1_000_000) * 0.10
        output_cost = (usage.completion_tokens / 1_000_000) * 0.40
        total_cost = input_cost + output_cost
        logger.info(f"Estimated cost: ${total_cost:.6f}")

        # 처리 시간 로깅
        logger.info(f"⏱️  LLM processing time: {elapsed_time:.2f}s")

        # schedules 배열 반환
        return schedules

    except Exception as e:
        logger.error(f"LLM parsing failed: {e}")
        return None


def normalize_schedule_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    LLM 파싱 결과를 정규화

    Args:
        data: LLM 파싱 결과

    Returns:
        정규화된 스케줄 데이터
    """
    # 빈 문자열을 None으로 변환하지 않고 그대로 유지
    normalized = {}

    for key, value in data.items():
        if isinstance(value, str):
            normalized[key] = value.strip()
        else:
            normalized[key] = value

    return normalized
