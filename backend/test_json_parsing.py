import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from parser import parse_structured_format

json_text = """{
  "schedules": [
    {
      "structured": {
        "예식일": "2025.09.20",
        "예식장": "한화리조트 몬테로소",
        "식시간": "13:30",
        "신랑신부": "오왕석 & 김지원",
        "연락처": "010-8003-1496",
        "브랜드": "비욘드 클래식",
        "앨범": "1인 2캠",
        "작가": "이효원",
        "담당자": "김판중감독",
        "촬영비": "25"
      },
      "freetext": [
        "플래너: 한화리조트",
        "사진업체: 세컨플로우",
        "[식순]",
        "-주례없는 예식"
      ]
    }
  ]
}"""

print("🔍 Testing parse_structured_format with JSON...")
print(f"Input starts with: {json_text[:50]}")

schedules = parse_structured_format(json_text)

print(f"\n✅ Parsed {len(schedules)} schedule(s)")
if schedules:
    s = schedules[0]
    print(f"\n📅 Schedule details:")
    print(f"  날짜: {s.date}")
    print(f"  장소: {s.location}")
    print(f"  시간: {s.time}")
    print(f"  신랑: {s.groom}, 신부: {s.bride}")
    print(f"  브랜드: {s.brand}")
    print(f"  앨범: {s.album}")
    print(f"  작가: {s.photographer}")
    print(f"  담당자: {s.manager}")
    print(f"  촬영비: {s.price}")
    print(f"\n📝 Memo (first 100 chars):")
    print(f"  {s.memo[:100] if s.memo else 'None'}...")
