import asyncio
import os
import sys

# 환경변수 로드
from dotenv import load_dotenv
load_dotenv()

# services 모듈을 import할 수 있도록 경로 추가
sys.path.insert(0, os.path.dirname(__file__))

from services.llm_parser import parse_with_llm

async def main():
    test_text = """담당감독: 김판중감독 (010-8003-1496)

예식일: 2025.09.20
식시간: 13:30
예식장: 한화리조트 몬테로소(지1층)
신랑신부님: 오왕석 & 김지원
플래너: 한화리조트
사진업체: 세컨플로우

상품: 비욘드 클래식, 1인 2캠
촬영범위: 사전촬영, 신부대기실, 로비, 본식, 원판
상품구성: 풀영상, 하이라이트, SNS 세로 영상
페이: 25

SNS동의: O
웨딩카: 모름

[신부님 전달사항]
* 

[식순]
-주례없는 예식
-특이사항-
상황에 따라 야외컷 스냅 촬영 진행 있습니다.
앞,뒤타임 같은홀에서 예식 있습니다. 상황에 따라 빠른 진행 부탁드립니다.^^;;ㅜ
로비 치즈박스 진행 있음
*신랑,신부님께서 홍콩에 거주하고 계십니다. 카톡(보이스톡)이나 이메일로 연락 부탁드립니다.ㅎ 
*축가2곡 , 축사1개 진행 예정

[촬영 요구사항]
* 사전 야외촬영 아마 할 겁니다. 일찍 가서 작가(이효원 작가) 잘 찾으시고 같이 촬영하세요."""

    print("🔍 Testing LLM parser...")
    result = await parse_with_llm(test_text)
    
    if result:
        print("\n📝 LLM OUTPUT:")
        print("="*80)
        print(result)
        print("="*80)
        print(f"\n✅ Output length: {len(result)} chars")
        
        # JSON 검증
        import json
        try:
            parsed = json.loads(result)
            print(f"✅ Valid JSON")
            print(f"📦 Keys: {list(parsed.keys())}")
            if 'schedules' in parsed:
                print(f"📅 Schedules count: {len(parsed['schedules'])}")
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
    else:
        print("❌ LLM returned None")

if __name__ == "__main__":
    asyncio.run(main())
