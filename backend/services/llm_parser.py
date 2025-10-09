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


# GPT-4는 Classic parser 형식으로 변환만 담당 (Structured Outputs 제거로 속도 개선)


SYSTEM_PROMPT = """당신은 웨딩 촬영 스케줄 포맷 변환 전문가입니다.

다양한 업체의 카카오톡 메시지를 받아서 **정해진 형식**으로 변환하세요. 최대 5개 스케줄까지만 처리합니다.

각 스케줄을 다음 형식으로 출력하세요 (한 줄에 하나씩):

```
YYYY.MM.DD
장소명
HH:MM
신랑 신부
010-1234-5678
브랜드명
앨범종류
작가이름
담당자이름
---
```

**규칙:**
1. 날짜: YYYY.MM.DD 형식 (예: 2025.12.25)
2. 장소: 예식장 이름만 깔끔하게 추출
3. 시간: HH:MM 24시간제 (오후2시 → 14:00, 오전11시반 → 11:30)
4. 신랑신부: 공백으로 분리 (예: 김철수 이영희)
5. 연락처: 실제 전화번호만 추출 (010으로 시작하는 11자리 숫자)
6. 브랜드: 특수문자 없이 깔끔하게 (예: "K [ 세븐스 ]" → "K 세븐스")
7. 앨범: 있는 그대로 추출 (30P, 기본30P, 프리미엄 등)
8. 작가: 작가/사진작가 이름만
9. 담당자: 담당자/매니저/계약자 이름
10. 구분선: 스케줄 끝에 --- 표시

**중요:**
- 정보가 없으면 아무것도 쓰지 말고 완전히 빈 줄로 남기세요
- "없음", "N/A", "010-없음" 같은 텍스트 절대 금지
- 스케줄 사이는 --- 로 구분
- 최대 5개까지만 처리
- 추가 설명이나 JSON 없이 위 형식만 출력
- 다양한 업체의 메시지 형식에 유연하게 대응하세요
"""


async def parse_with_llm(message: str) -> Optional[str]:
    """
    LLM을 사용하여 메시지를 Classic parser 형식으로 변환 (최대 5개 스케줄, 3000자 제한)

    Args:
        message: 파싱할 카카오톡 메시지

    Returns:
        Classic parser 형식의 텍스트 (실패 시 None)
    """
    global client

    # 클라이언트 초기화 확인
    if client is None:
        if not init_openai_client():
            logger.error("OpenAI client not available")
            return None

    # 텍스트 길이 제한 (3000자)
    MAX_LENGTH = 3000
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
                {"role": "user", "content": f"다음 메시지를 변환해주세요:\n\n{message}"}
            ],
            temperature=0  # 일관성을 위해 0으로 설정
        )

        # 종료 시간 계산
        elapsed_time = time.time() - start_time

        # 텍스트 응답 추출
        converted_text = response.choices[0].message.content.strip()

        # 토큰 사용량 로깅 (비용 모니터링)
        usage = response.usage
        logger.info(f"LLM conversion successful - Tokens: input={usage.prompt_tokens}, output={usage.completion_tokens}, total={usage.total_tokens}")

        # 비용 계산 (GPT-4.1-nano 요금)
        input_cost = (usage.prompt_tokens / 1_000_000) * 0.10
        output_cost = (usage.completion_tokens / 1_000_000) * 0.40
        total_cost = input_cost + output_cost
        logger.info(f"Estimated cost: ${total_cost:.6f}")

        # 처리 시간 로깅
        logger.info(f"⏱️  LLM processing time: {elapsed_time:.2f}s")

        # Classic parser 형식의 텍스트 반환
        logger.info(f"Converted text length: {len(converted_text)} chars")
        return converted_text

    except Exception as e:
        logger.error(f"LLM parsing failed: {e}")
        return None


# normalize_schedule_data 함수는 더 이상 필요 없음 (Classic parser가 처리)
