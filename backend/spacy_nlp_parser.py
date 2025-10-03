"""
spaCy 기반 고성능 NLP 스케줄 파서
이전 scikit-learn 기반 파서보다 훨씬 강력한 자연어 처리 능력 제공
"""

import spacy
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

# spaCy 한국어 모델 로드 (전역으로 한 번만 로드)
try:
    nlp = spacy.load('ko_core_news_sm')
except OSError:
    print("⚠️  spaCy 한국어 모델이 설치되지 않았습니다. 'python -m spacy download ko_core_news_sm' 명령을 실행하세요.")
    nlp = None

@dataclass
class ScheduleInfo:
    date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    couple: Optional[str] = None
    brand: Optional[str] = None
    photographer: Optional[str] = None
    contact: Optional[str] = None
    needs_review: bool = True
    review_reason: str = ""
    parser_used: str = "spacy_nlp"

def normalize_text(text: str) -> str:
    """텍스트 전처리 및 정규화"""
    # 이모티콘 제거
    text = re.sub(r'[🎉📍👰🏻🤵🏻📸💕💰⭐️]', '', text)

    # 오타 수정
    typo_fixes = {
        '알범': '앨범',
        '그래피': '그래피',
        '오후3시': '오후 3시',
        '2시반': '2시30분',
        '해보이소': '해보세요'
    }

    for typo, correct in typo_fixes.items():
        text = text.replace(typo, correct)

    # 띄어쓰기 정규화 (날짜, 시간 관련)
    text = re.sub(r'(\d+월)(\d+일)', r'\1 \2', text)
    text = re.sub(r'(\d+일)(토요일|일요일|월요일|화요일|수요일|목요일|금요일)', r'\1 \2', text)
    text = re.sub(r'(오전|오후)(\d+시)', r'\1 \2', text)
    text = re.sub(r'(\d+시)(\d+분)', r'\1\2', text)

    return text.strip()

def extract_entities_with_spacy(text: str) -> Dict[str, List[str]]:
    """spaCy를 사용한 개체명 추출"""
    if not nlp:
        return {}

    normalized_text = normalize_text(text)
    doc = nlp(normalized_text)

    entities = {
        'persons': [],      # PS (인명)
        'locations': [],    # LC (지명), OG (조직/장소명)
        'dates': [],        # DT (날짜)
        'times': [],        # TI (시간)
        'quantities': []    # QT (수량/번호)
    }

    for ent in doc.ents:
        if ent.label_ == 'PS':  # 인명
            entities['persons'].append(ent.text)
        elif ent.label_ in ['LC', 'OG']:  # 지명, 조직명
            entities['locations'].append(ent.text)
        elif ent.label_ == 'DT':  # 날짜
            entities['dates'].append(ent.text)
        elif ent.label_ == 'TI':  # 시간
            entities['times'].append(ent.text)
        elif ent.label_ == 'QT':  # 수량
            entities['quantities'].append(ent.text)

    return entities

def extract_date_from_entities(entities: Dict[str, List[str]], text: str) -> Optional[str]:
    """개체명에서 날짜 추출 및 정규화"""
    current_year = datetime.now().year

    # spaCy가 인식한 날짜 개체 우선 처리
    for date_ent in entities.get('dates', []):
        # "내일", "오늘", "모레" 등 상대적 날짜
        if '내일' in date_ent:
            tomorrow = datetime.now() + timedelta(days=1)
            return tomorrow.strftime('%Y.%m.%d')
        elif '오늘' in date_ent:
            return datetime.now().strftime('%Y.%m.%d')
        elif '모레' in date_ent:
            day_after_tomorrow = datetime.now() + timedelta(days=2)
            return day_after_tomorrow.strftime('%Y.%m.%d')

    # 정규표현식으로 날짜 패턴 추출 (백업)
    date_patterns = [
        r'(\d{1,2})월\s*(\d{1,2})일',
        r'(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})',
        r'(\d{1,2})[.\-/](\d{1,2})'
    ]

    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            if len(match.groups()) == 2:  # MM월 DD일 형태
                month, day = match.groups()
                return f"{current_year}.{int(month):02d}.{int(day):02d}"
            elif len(match.groups()) == 3:  # YYYY.MM.DD 형태
                year, month, day = match.groups()
                return f"{year}.{int(month):02d}.{int(day):02d}"

    # 요일 기반 날짜 추측
    weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
    for i, weekday in enumerate(weekdays):
        if weekday in text:
            # 가장 가까운 해당 요일 찾기
            today = datetime.now()
            days_ahead = i - today.weekday()
            if days_ahead <= 0:  # 이미 지났거나 오늘이면 다음 주
                days_ahead += 7
            target_date = today + timedelta(days=days_ahead)
            return target_date.strftime('%Y.%m.%d')

    return None

def extract_time_from_entities(entities: Dict[str, List[str]], text: str) -> Optional[str]:
    """개체명에서 시간 추출 및 정규화"""
    # spaCy가 인식한 시간 개체 우선 처리
    for time_ent in entities.get('times', []):
        # "오후 2시반에" -> "14:30"
        time_match = re.search(r'(오전|오후)?\s*(\d{1,2})시(\d{1,2}분|반)?', time_ent)
        if time_match:
            period, hour, minute_part = time_match.groups()
            hour = int(hour)

            if period == '오후' and hour != 12:
                hour += 12
            elif period == '오전' and hour == 12:
                hour = 0

            if minute_part == '반':
                minute = 30
            elif minute_part and '분' in minute_part:
                minute = int(minute_part.replace('분', ''))
            else:
                minute = 0

            return f"{hour:02d}:{minute:02d}"

    # 정규표현식 백업
    time_patterns = [
        r'(오전|오후)?\s*(\d{1,2})시\s*(\d{1,2})분',
        r'(오전|오후)?\s*(\d{1,2})시반',
        r'(오전|오후)?\s*(\d{1,2})시',
        r'(\d{1,2}):(\d{2})'
    ]

    for pattern in time_patterns:
        match = re.search(pattern, text)
        if match:
            groups = match.groups()
            if len(groups) == 3 and groups[2]:  # 오전/오후 + 시 + 분
                period, hour, minute = groups
                hour, minute = int(hour), int(minute)
            elif len(groups) == 2 and groups[0] in ['오전', '오후']:  # 오전/오후 + 시반
                period, hour = groups
                hour, minute = int(hour), 30
            elif len(groups) == 2 and groups[0].isdigit():  # HH:MM
                hour, minute = int(groups[0]), int(groups[1])
                period = None
            else:
                continue

            if period == '오후' and hour != 12:
                hour += 12
            elif period == '오전' and hour == 12:
                hour = 0

            return f"{hour:02d}:{minute:02d}"

    return None

def extract_venue_from_entities(entities: Dict[str, List[str]], text: str) -> Optional[str]:
    """개체명에서 장소 추출"""
    # spaCy가 인식한 지명/조직명 우선 사용
    for location in entities.get('locations', []):
        # 호텔, 웨딩홀 키워드가 포함된 경우 우선
        if any(keyword in location for keyword in ['호텔', '웨딩홀', '컨벤션', '센터', '플레이스']):
            return location.replace('에서', '').replace('에', '').strip()

    # 첫 번째 지명/조직명 사용
    if entities.get('locations'):
        return entities['locations'][0].replace('에서', '').replace('에', '').strip()

    # 정규표현식 백업
    venue_patterns = [
        r'([가-힣\s]+(?:호텔|웨딩홀|컨벤션|센터|플레이스|채플))',
        r'([가-힣]+\s*[가-힣]*(?:호텔|웨딩홀))'
    ]

    for pattern in venue_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()

    return None

def extract_couple_from_entities(entities: Dict[str, List[str]]) -> Optional[str]:
    """개체명에서 신랑신부 추출"""
    persons = entities.get('persons', [])
    if len(persons) >= 2:
        # 두 명 이상의 인명이 있으면 신랑신부로 간주
        return ' '.join(persons[:2])
    elif len(persons) == 1:
        return persons[0]

    return None

def is_meaningful_schedule_spacy(text: str, entities: Dict[str, List[str]]) -> bool:
    """spaCy 기반 의미있는 스케줄 판단"""
    # 노이즈 패턴 (취소, 문의, 일반적인 대화)
    noise_patterns = [
        r'취소', r'죄송', r'다시 연락', r'문의.*드려', r'혹시나',
        r'가능한 날', r'대략적인', r'얼마인지', r'비용.*궁금'
    ]

    for pattern in noise_patterns:
        if re.search(pattern, text):
            return False

    # 핵심 스케줄 요소가 있는지 확인
    has_date = bool(entities.get('dates')) or any(keyword in text for keyword in ['내일', '오늘', '일요일', '토요일', '월요일'])
    has_time = bool(entities.get('times')) or bool(re.search(r'\d+시', text))
    has_venue = bool(entities.get('locations'))

    # 최소 1개 이상의 핵심 요소가 있어야 의미있는 스케줄 (기준 완화)
    core_elements = sum([has_date, has_time, has_venue])

    return core_elements >= 1

def parse_schedule_with_spacy(text: str) -> Optional[ScheduleInfo]:
    """spaCy를 사용한 고성능 스케줄 파싱"""
    if not nlp:
        return None

    # 텍스트 정규화
    normalized_text = normalize_text(text)

    # spaCy로 개체명 추출
    entities = extract_entities_with_spacy(normalized_text)

    # 의미있는 스케줄인지 판단
    if not is_meaningful_schedule_spacy(normalized_text, entities):
        return None

    # 각 요소 추출
    schedule = ScheduleInfo()
    schedule.date = extract_date_from_entities(entities, normalized_text)
    schedule.time = extract_time_from_entities(entities, normalized_text)
    schedule.venue = extract_venue_from_entities(entities, normalized_text)
    schedule.couple = extract_couple_from_entities(entities)

    # 브랜드/앨범 추출 (정규표현식)
    brand_patterns = [
        r'앨범[:\s]*([가-힣A-Za-z\s\-]+)',
        r'브랜드[:\s]*([가-힣A-Za-z\s\-]+)',
        r'(그래피|K세븐스|비세븐스|에이프리미엄|세컨드플로우)'
    ]

    for pattern in brand_patterns:
        match = re.search(pattern, normalized_text)
        if match:
            schedule.brand = match.group(1).strip()
            break

    # 검토 필요성 판단
    missing_elements = []
    if not schedule.date:
        missing_elements.append('날짜')
    if not schedule.time:
        missing_elements.append('시간')
    if not schedule.venue:
        missing_elements.append('장소')

    if missing_elements:
        schedule.needs_review = True
        schedule.review_reason = f"누락된 정보: {', '.join(missing_elements)}"
    else:
        schedule.needs_review = False
        schedule.review_reason = ""

    # 최소한 날짜나 시간 중 하나는 있어야 함
    if not schedule.date and not schedule.time:
        return None

    return schedule

def test_spacy_parser():
    """spaCy 파서 테스트 함수"""
    test_cases = [
        "내일 오후3시 롯데호텔부산에서 촬영있는데 김민수 박지원씨 가능하신가요??",
        "11월5일토요일오전11시30분부산마리나베이101웨딩홀",
        "이번주 일요일 오후 2시반에 김해 가야컨벤션센터에서 촬영 한 번 해보이소",
        "🎉 12월 1일 (토) 오후 1시 🎉 📍 부산 파라다이스호텔 그랜드볼룸",
        "죄송합니다 내일 촬영 취소하게 됐어요ㅠㅠ",
        "혹시나 해서 연락드려봅니다 12월 중에 웨딩촬영 가능한 날이 있나요?"
    ]

    # Test functionality without printing sensitive data
    for test_text in test_cases:
        result = parse_schedule_with_spacy(test_text)

if __name__ == "__main__":
    test_spacy_parser()