# LLM 파서 통합 가이드

## 개요

OpenAI GPT-4.1-nano를 사용한 LLM 기반 스케줄 파서가 추가되었습니다. Structured Outputs를 사용하여 정확한 JSON 스키마를 보장합니다.

## 왜 GPT-4.1-nano?

| 모델 | 속도 | 비용/요청 | 장점 |
|------|------|-----------|------|
| GPT-5-nano | 🐌 ~11초 | ~$0.00003 | 제일 저렴 |
| **GPT-4.1-nano** | 🚀 **~3초** | ~$0.00005 | **빠르고 저렴** |
| GPT-4o-mini | 🚀 ~2초 | ~$0.0001 | 검증됨 |

**GPT-4.1-nano를 선택한 이유:**
- ✅ GPT-4o-mini 대비 50% 저렴
- ✅ 평균 3초 응답 (2-3회부터는 ~1초)
- ✅ Structured Outputs 완벽 지원

## 설치 및 설정

### 1. 패키지 설치

```bash
cd backend
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일에 OpenAI API 키를 추가하세요:

```bash
# OpenAI API Key for LLM parser (GPT-4.1-nano)
OPENAI_API_KEY=sk-proj-...your-api-key...
```

**API 키 발급:** https://platform.openai.com/api-keys

## 사용 방법

### 프론트엔드에서 사용

1. 스케줄 추가 버튼 클릭
2. "텍스트 입력" 또는 "파일 업로드" 탭
3. **파서 엔진** → "LLM (GPT-4.1-nano) 💰" 선택
4. 카카오톡 메시지 입력/업로드
5. 자동 파싱 (평균 3초)

## 파서 엔진 비교

| 엔진 | 설명 | 속도 | 비용 | 정확도 |
|------|------|------|------|--------|
| **Classic** | 정규표현식 | ⚡ 즉시 | 무료 | 패턴에 의존 |
| **LLM** | GPT-4.1-nano | 🚀 ~3초 | ~$0.00005 | 높음 |
| Hybrid | Classic+NLP | ⚡ 즉시 | 무료 | 중간 |
| AI Only | spaCy | ⚡ 즉시 | 무료 | 낮음 |

## 비용 정보

### GPT-4.1-nano 요금

- **입력:** $0.10 / 1M 토큰
- **출력:** $0.40 / 1M 토큰
- **평균 요청:** ~$0.00005 (약 0.07원)

### GPT-4o-mini 대비 절감

- **입력:** 33% 저렴 ($0.15 → $0.10)
- **출력:** 33% 저렴 ($0.60 → $0.40)
- **전체:** 약 **50% 비용 절감**

### 예상 비용

- **100개 파싱:** ~$0.005 (약 7원)
- **1,000개 파싱:** ~$0.05 (약 70원)
- **10,000개 파싱:** ~$0.50 (약 700원)

### 비용 모니터링

백엔드 로그에서 실시간 확인:

```
INFO:llm_parser:LLM parsing successful - Tokens: input=150, output=80
INFO:llm_parser:Estimated cost: $0.000042
```

## 성능 벤치마크

### 응답 속도 테스트 (2025-10-09)

```
시도 1: 7.57초  (cold start)
시도 2: 1.17초
시도 3: 0.99초

평균: 3.24초
```

**최적화 팁:**
- 첫 요청은 7-8초 (cold start)
- 이후 요청은 ~1초 (캐시 효과)
- 프론트엔드 디바운스: 800ms

## 구현 세부사항

### JSON 스키마 (Structured Outputs)

```json
{
  "date": "YYYY.MM.DD",
  "time": "HH:MM (24시간제)",
  "location": "예식장 이름",
  "couple": "신랑♥신부",
  "contact": "전화번호",
  "brand": "K7|B7|A+|Graphy|2ndFlow",
  "album": "앨범 종류",
  "photographer": "작가 이름",
  "cuts": 0,
  "price": 0,
  "manager": "담당자",
  "memo": "메모"
}
```

### 시스템 프롬프트 변환 예시

- "오후 2시" → "14:00"
- "낮 12시" → "12:00"
- "오전 11시반" → "11:30"

## 테스트

### 빠른 테스트

```bash
cd backend
source venv/bin/activate
OPENAI_API_KEY=your-key python3 << 'EOF'
import asyncio
from services.llm_parser import parse_with_llm

async def test():
    result = await parse_with_llm("12월 25일 오후2시 강남웨딩홀 김철수이영희")
    print(result)

asyncio.run(test())
