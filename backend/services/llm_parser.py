"""
OpenAI GPT-4o-mini를 사용한 LLM 기반 스케줄 파서
구조화된 키-값 형식으로 변환하여 우리 파서가 처리
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


# GPT-4o-mini는 구조화된 키-값 형식으로 변환만 담당 (빠르고 정확)


SYSTEM_PROMPT = """당신은 웨딩 촬영 스케줄 포맷 변환 전문가입니다.

다양한 업체(사진, 영상, 플래너 등)의 카카오톡 메시지를 받아서 **구조화된 키-값 형식**으로 변환하세요. 최대 5개 스케줄까지만 처리합니다.

**출력 형식 (키: 값 형태):**

반드시 첫 줄에 `<!-- LLM_PARSED -->` 마커를 추가하세요.

```
<!-- LLM_PARSED -->
예식일: YYYY.MM.DD
예식장: 장소명
식시간: HH:MM
신랑신부: 신랑이름 & 신부이름
연락처: 010-1234-5678
브랜드: 브랜드명
앨범: 앨범종류
작가: 작가이름
담당자: 담당자이름
컷수: 숫자
촬영비: 250000

(추가 정보 키-값 쌍...)

[섹션제목]
내용...

---
```

**핵심 필드 (Schedule 객체로 자동 매핑):**
1. **예식일**: YYYY.MM.DD 형식 (예: 2025.09.20)
2. **예식장**: 예식장 이름만 깔끔하게 (예: "한화리조트 몬테로소(지1층)")
3. **식시간**: HH:MM 24시간제 (오후2시 → 14:00, 오전11시반 → 11:30)
4. **신랑신부**: "신랑이름 & 신부이름" 또는 "신랑이름 신부이름" 형식
5. **연락처**: 010으로 시작하는 전화번호 (있으면)
6. **브랜드**: 상품 브랜드명 (사진/영상 패키지 이름)
7. **앨범**: 앨범 종류/구성
8. **작가**: 사진작가/영상감독 이름
9. **담당자**: 매니저/계약자/담당자 이름
10. **컷수**: 촬영 컷수 (숫자만)
11. **촬영비**: 만원 단위 금액을 원 단위로 변환 (25 → 250000, 30 → 300000)

**추가 정보 (핵심 필드 외 모든 정보):**
- 위 11개 핵심 필드에 해당하지 않는 **모든 정보를 반드시 출력**
- 원본 메시지의 모든 라인을 확인하고 누락 없이 변환
- 예시: 사진업체, 플래너, 촬영범위, 상품구성, SNS동의, 웨딩카 등
- **정보 누락 절대 금지** - 작은 정보라도 모두 포함

**중복 제거 규칙:**
- 같은 내용을 절대 두 번 출력하지 마세요
- "담당자: 홍길동"을 핵심 필드로 출력했다면, "담당감독: 홍길동"은 출력하지 마세요
- "촬영비: 250000"을 핵심 필드로 출력했다면, "페이: 25"는 출력하지 마세요
- 단, 중복이 아닌 **새로운 정보는 반드시 모두 출력**해야 합니다

**섹션 처리:**
- [섹션제목] 형태는 그대로 유지하고, 내용을 그 아래에 작성
- 예: "[신부님 전달사항]" 다음 줄에 내용
- 예: "[식순]" 다음 줄에 내용

**중요 규칙:**
- 정보가 없는 필드는 아예 쓰지 마세요 (빈 줄 금지)
- "없음", "N/A" 같은 텍스트 절대 금지
- 스케줄 구분: --- 사용
- 최대 5개 스케줄까지만 처리
- 추가 설명 없이 키-값 형식만 출력
- 중복 없이 깔끔하게

**목표:** 다양한 업체의 메시지를 우리 파서가 이해할 수 있는 구조화된 형식으로 변환하여, 핵심 정보는 자동 매핑되고 나머지는 메모로 깔끔하게 정리되도록 합니다.
"""


async def parse_with_llm(message: str) -> Optional[str]:
    """
    LLM을 사용하여 메시지를 Structured parser 형식으로 변환 (최대 5개 스케줄, 3000자 제한)

    핵심 필드는 Schedule 객체로 자동 매핑되고, 나머지는 memo에 구조화된 형식으로 저장됨

    Args:
        message: 파싱할 카카오톡 메시지

    Returns:
        Structured parser 형식의 텍스트 (키-값 형태, 실패 시 None)
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
            model="gpt-4o-mini",
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

        # 마크다운 코드 블록 제거 (LLM이 ```로 감싸는 경우)
        if converted_text.startswith('```'):
            lines = converted_text.split('\n')
            # 첫 줄이 ``` 또는 ```text 형태면 제거
            if lines[0].startswith('```'):
                lines = lines[1:]
            # 마지막 줄이 ```이면 제거
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            converted_text = '\n'.join(lines).strip()

        # 토큰 사용량 로깅 (비용 모니터링)
        usage = response.usage
        logger.info(f"LLM conversion successful - Tokens: input={usage.prompt_tokens}, output={usage.completion_tokens}, total={usage.total_tokens}")

        # 비용 계산 (GPT-4o-mini 요금)
        input_cost = (usage.prompt_tokens / 1_000_000) * 0.15
        output_cost = (usage.completion_tokens / 1_000_000) * 0.60
        total_cost = input_cost + output_cost
        logger.info(f"Estimated cost: ${total_cost:.6f} (gpt-4o-mini)")

        # 처리 시간 로깅
        logger.info(f"⏱️  LLM processing time: {elapsed_time:.2f}s")

        # Classic parser 형식의 텍스트 반환
        logger.info(f"Converted text length: {len(converted_text)} chars")
        return converted_text

    except Exception as e:
        logger.error(f"LLM parsing failed: {e}")
        return None


# normalize_schedule_data 함수는 더 이상 필요 없음 (Classic parser가 처리)
