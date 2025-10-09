import re
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timedelta

# NLP imports (spaCy)
try:
    import spacy
    nlp = spacy.load('ko_core_news_sm')
    NLP_AVAILABLE = True
except (ImportError, OSError):
    nlp = None
    NLP_AVAILABLE = False

# --- Constants ---
BRAND_PATTERNS = [
    r'K\s*\[\s*세븐스\s*\]',  # K [ 세븐스 ]
    r'K\s*세븐스',             # K 세븐스
    r'B\s*세븐스',             # B 세븐스
    r'A\s*세븐스프리미엄',      # A 세븐스프리미엄
    r'더그라피',               # 더그라피
    r'세컨플로우'              # 세컨플로우
]

ALBUM_PATTERNS = [
    r'기본\s*\d{2,3}[Pp]',    # 기본30P, 기본 30P, 기본50p 등 (공백 허용)
    r'\d{2,3}[Pp]',           # 30P, 40P, 30p, 40p 등 (대소문자 모두)
]

PHOTOGRAPHER_EXCLUDED_TERMS = [
    '폐백없음', '폐백있음', '폐백진행', '폐백제외', '폐백미정', '폐백생략',
    '선촬영', '홀스냅', '주례없음', '주례있음', '플래시컷', '플라워샤워'
]

PHOTOGRAPHER_NAMES = [
    '안현우', '홍길동', '김영수', '이민호', '박지성', '최영희', '정수연', '나은빈'
]

DEFAULT_ALBUM = '30P'
MANAGER_NAME = 'KPAG(업무용)'

# NLP-style parsing constants
LOCATION_KEYWORDS = [
    '호텔', '웨딩홀', '컨벤션', '교회', '성당', '채플', '스튜디오', '홀', '센터', '타워',
    '그랜드', '메르시앙', '플로팅', '이리스', '하우스', '팰리스', '레지던스'
]

COMMON_WORDS = [
    '스케줄', '촬영', '연락', '드려', '봅니다', '주세요', '가능', '있으면', '해서',
    '건당', '만원', '추가', '입니다', '출장비', '예약', '문의', '확인'
]

# Date prediction constants
WEEKDAY_PATTERNS = {
    r'일요일?': 6,  # Sunday
    r'월요일?': 0,  # Monday
    r'화요일?': 1,  # Tuesday
    r'수요일?': 2,  # Wednesday
    r'목요일?': 3,  # Thursday
    r'금요일?': 4,  # Friday
    r'토요일?': 5   # Saturday
}

# Date prediction functions
def get_next_saturday():
    """이번 주 토요일 날짜를 반환"""
    today = datetime.now()
    days_ahead = 5 - today.weekday()  # Saturday is 5 (Monday=0)
    if days_ahead <= 0:  # 이미 지났으면 다음 주 토요일
        days_ahead += 7
    saturday = today + timedelta(days=days_ahead)
    return saturday.strftime("%m월 %d일")

def get_date_from_weekday(weekday_text):
    """요일을 기준으로 가장 가까운 해당 요일의 날짜를 반환"""
    today = datetime.now()

    # 요일 패턴 매칭
    target_weekday = None
    for pattern, weekday_num in WEEKDAY_PATTERNS.items():
        if re.search(pattern, weekday_text):
            target_weekday = weekday_num
            break

    if target_weekday is None:
        return get_next_saturday()  # 기본값은 이번 주 토요일

    # 가장 가까운 해당 요일 찾기
    days_ahead = target_weekday - today.weekday()
    if days_ahead <= 0:  # 이미 지났으면 다음 주
        days_ahead += 7

    target_date = today + timedelta(days=days_ahead)
    return target_date.strftime("%m월 %d일")

def predict_date_from_text(text):
    """텍스트에서 날짜 정보가 없으면 추측해서 반환"""
    # 기존 날짜 패턴이 있는지 확인
    date_patterns = [
        r'(\d{1,2})월\s*(\d{1,2})일',  # MM월 DD일
        r'(\d{4})[-./](\d{1,2})[-./](\d{1,2})',  # YYYY-MM-DD
        r'(\d{1,2})[-./](\d{1,2})',  # MM-DD
    ]

    for pattern in date_patterns:
        if re.search(pattern, text):
            return None  # 기존 날짜가 있으면 None 반환 (변경 없음)

    # 요일이 있는지 확인
    for pattern in WEEKDAY_PATTERNS.keys():
        if re.search(pattern, text):
            return get_date_from_weekday(text)

    # 날짜 정보가 전혀 없으면 이번 주 토요일
    return get_next_saturday()

# Legacy constants (deprecated - use above constants instead)
BRANDS_WITH_CONTACT_NEXT = ['A 세븐스프리미엄', '더그라피', '세컨플로우']
BRAND_WITH_DUMMY_DATA = '세컨플로우'

@dataclass
class Schedule:
    # Core fields
    date: str = ""
    location: str = ""
    time: str = ""
    couple: str = ""
    # Parsed fields
    contact: str = ""
    brand: str = ""
    album: str = ""
    photographer: str = ""
    memo: str = ""
    manager: str = ""
    price: int = 0  # 촬영단가 (숫자만)
    needs_review: bool = False
    review_reason: str = ""  # 검토 필요 이유

    def to_dict(self) -> Dict:
        return self.__dict__

# --- Helper Functions ---
def extract_date(line: str) -> str:
    """
    Extract the date pattern (YYYY.MM.DD) from a line.
    Returns the clean date string or empty string if not found.
    This is more flexible and handles various formatting issues.
    """
    # Look for YYYY.MM.DD pattern anywhere in the line
    # More flexible pattern that doesn't require word boundaries
    date_pattern = r'(\d{4}\.\d{2}\.\d{2})'
    match = re.search(date_pattern, line.strip())
    return match.group(1) if match else ""

def is_valid_date(line: str) -> bool:
    """
    Check if line contains a valid date pattern (YYYY.MM.DD).
    This approach searches for the date pattern anywhere in the line,
    making it resilient to various formatting issues and typos.
    """
    return bool(extract_date(line))
def is_valid_time(line: str) -> bool: return bool(re.match(r'^\d{2}:\d{2}$', line.strip()))
def is_valid_couple(line: str) -> bool:
    line = line.strip()

    # 숫자가 포함되어 있으면 신랑신부가 아님
    if any(char.isdigit() for char in line):
        return False

    # 공백으로 분리된 경우
    parts = line.split()

    # 한 명의 이름 (신랑 또는 신부만)
    if len(parts) == 1 and 2 <= len(parts[0]) <= 10 and all(c.isalpha() and '\uac00' <= c <= '\ud7af' for c in parts[0]):
        return True

    # 일반적인 2개 이름 (기존 방식)
    if len(parts) == 2 and all(len(p) <= 10 for p in parts):
        return True

    # 외자 이름 패턴 (3개 부분)
    if len(parts) == 3 and re.match(r'^[가-힣]+\s+[가-힣]+\s+[가-힣]+$', line):
        # 패턴 1: "배승희 윤 정" (한글이름 + 한글자 + 한글자)
        if len(parts[1]) == 1 and len(parts[2]) == 1:
            return True
        # 패턴 2: "이 준 이주연" (한글자 + 한글자 + 한글이름)
        if len(parts[0]) == 1 and len(parts[1]) == 1:
            return True

    # 공백 없이 붙어있는 경우: 4글자 이상의 한글만 허용 (기존 로직 유지)
    if len(parts) == 1 and len(line) >= 4 and all(c.isalpha() and '\uac00' <= c <= '\ud7af' for c in line):
        return True

    return False

def separate_couple_names(couple_str: str) -> str:
    """
    붙어있는 신랑신부 이름을 분리합니다.
    예: '오세준이지선' -> '오세준 이지선'
    예: '배승희 윤 정' -> '배승희 윤정' (뒤쪽 외자 이름 정리)
    예: '이 준 이주연' -> '이준 이주연' (앞쪽 외자 이름 정리)
    """
    couple_str = couple_str.strip()

    # 외자 이름 패턴 처리
    if re.match(r'^[가-힣]+\s+[가-힣]+\s+[가-힣]+$', couple_str):
        parts = couple_str.split()
        if len(parts) == 3:
            # 패턴 1: "배승희 윤 정" -> "배승희 윤정"
            if len(parts[1]) == 1 and len(parts[2]) == 1:
                return f"{parts[0]} {parts[1]}{parts[2]}"
            # 패턴 2: "이 준 이주연" -> "이준 이주연"
            elif len(parts[0]) == 1 and len(parts[1]) == 1:
                return f"{parts[0]}{parts[1]} {parts[2]}"

    # 이미 공백으로 분리되어 있으면 그대로 반환 (단, 외자 패턴 제외)
    if ' ' in couple_str:
        return couple_str

    # 4글자 이상인 한글 문자열만 처리
    if len(couple_str) < 4 or not all(c.isalpha() and '\uac00' <= c <= '\ud7af' for c in couple_str):
        return couple_str

    # 6글자면 3글자씩 분리 (가장 일반적인 한국인 이름 패턴)
    if len(couple_str) == 6:
        return f"{couple_str[:3]} {couple_str[3:]}"

    # 가능한 분리 위치들을 시도 (3글자 우선, 그 다음 2글자)
    possible_splits = []

    # 3글자 + 나머지 (우선순위)
    if len(couple_str) >= 5:
        possible_splits.append((couple_str[:3], couple_str[3:]))

    # 2글자 + 나머지 (차선책)
    if len(couple_str) >= 4:
        possible_splits.append((couple_str[:2], couple_str[2:]))

    # 이름으로 적절한 분리를 찾기 (2-4글자 범위)
    for first, second in possible_splits:
        if 2 <= len(first) <= 4 and 2 <= len(second) <= 4:
            return f"{first} {second}"

    # 분리할 수 없으면 원본 반환
    return couple_str

def is_valid_photographer_name(name: str) -> bool:
    name = name.strip()
    if name in PHOTOGRAPHER_EXCLUDED_TERMS:
        return False
    return bool(re.match(r'^[가-힣]{2,4}$', name))
def parse_contact(line: str) -> str:
    m = re.search(r'(010[- .]?\d{4}[- .]?\d{4})', line)
    if not m:
        return ""

    # Extract only digits and format as 010-XXXX-XXXX
    digits = re.sub(r'[^0-9]', '', m.group(1))
    if len(digits) == 11 and digits.startswith('010'):
        return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
    return m.group(1)  # Return original if formatting fails
def clean_location(location: str) -> str:
    """Clean location name by removing parentheses content, '단독'/'단독홀', trailing '홀', and standardizing names"""
    if not location:
        return location

    # Remove parentheses and their content (e.g., "(17층)", "(해운대)")
    location = re.sub(r'\([^)]*\)', '', location).strip()

    # Remove "단독" or "단독홀"
    location = re.sub(r'단독홀?', '', location).strip()

    # Remove "홀" at the end of location name
    if location.endswith('홀'):
        location = location[:-1].strip()

    # Standardize specific location names
    venue_replacements = {
        '더블유': '센텀',
        '그랜드 블랑': '그랜드블랑'
    }

    for old_name, new_name in venue_replacements.items():
        if old_name in location:
            location = location.replace(old_name, new_name)

    return location.strip()
def parse_brand_album(line: str) -> (str, str):
    # Create regex pattern from BRAND_PATTERNS
    brand_pattern = '|'.join([f'({pattern})' for pattern in BRAND_PATTERNS])
    brand_match = re.search(brand_pattern, line)

    # Create regex pattern from ALBUM_PATTERNS
    album_pattern = '|'.join([f'({pattern})' for pattern in ALBUM_PATTERNS])
    album_match = re.search(album_pattern, line, re.IGNORECASE)

    # 브랜드: 대괄호 제거, trim, 연속 공백 정규화
    brand = brand_match.group(0).replace('[', '').replace(']', '').strip() if brand_match else ""
    if brand:
        brand = re.sub(r'\s+', ' ', brand)  # 연속된 공백을 하나로

    # 앨범: 대문자 변환, 연속 공백 정규화
    album = album_match.group(0).upper() if album_match else ""
    if album:
        album = re.sub(r'\s+', ' ', album)  # 연속된 공백을 하나로

    # "기본 30P" 형태에서 공백 제거하여 "기본30P"로 정규화
    if album and '기본' in album:
        album = re.sub(r'기본\s*(\d{2,3}[Pp])', r'기본\1', album, flags=re.IGNORECASE)

    # If no album found but "기본" is mentioned, default to DEFAULT_ALBUM
    if not album and "기본" in line:
        album = DEFAULT_ALBUM

    # If brand exists but no album and line only contains brand (and whitespace), default to DEFAULT_ALBUM
    if brand and not album:
        # Remove the brand from line and check if remaining text is minimal
        remaining_text = line
        if brand_match:
            remaining_text = line.replace(brand_match.group(0), '').strip()

        # If remaining text is empty or only contains brackets/spaces, default to DEFAULT_ALBUM
        if not remaining_text or re.match(r'^[\[\]\s]*$', remaining_text):
            album = DEFAULT_ALBUM

    return brand, album

def detect_chat_format(raw_text: str) -> str:
    """
    Detect if the chat log is from desktop, mobile, or compact format.
    Returns 'desktop', 'mobile', 'compact', or 'unknown'.
    """
    lines = raw_text.splitlines()[:50]  # Check first 50 lines for format detection

    desktop_pattern_count = 0
    mobile_pattern_count = 0
    compact_pattern_count = 0

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Desktop format: [Speaker] [오전/오후 HH:MM] content
        if re.search(r'^\[([^\]]+)\]\s*\[(오전|오후)\s*\d{1,2}:\d{2}\]', line):
            desktop_pattern_count += 1

        # Mobile format: YYYY년 MM월 DD일 오전/오후 HH:MM, Speaker : content
        elif re.search(r'^\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(오전|오후)\s*\d{1,2}:\d{2},\s*[^:]+\s*:', line):
            mobile_pattern_count += 1

        # Compact format patterns:
        # 1. MM월 DD일 HH시 장소 신랑 신부 - 작가
        # 2. MM월 DD일 HH시MM분 장소 신랑 신부 - 작가
        # 3. MM월 DD일 HH:MM시 장소 신랑 신부 - 작가
        # 4. 장소 HH시 (incomplete format)
        # 5. 장소명 HH시MM분 (more incomplete)
        elif (re.search(r'^\d{1,2}월\s*\d{1,2}일\s*\d{1,2}시(?:\d{1,2}분|:\d{2}시)?\s+.+\s+[가-힣]+\s+[가-힣]+\s*-\s*[가-힣]+\s*작가', line) or
              re.search(r'^[가-힣\s"]+\s+\d{1,2}시(?:\d{1,2}분)?(?:\s+[가-힣\s]*)?$', line) or
              re.search(r'^\d{1,2}월\d{1,2}일\s+[가-힣]+', line)):
            compact_pattern_count += 1

    if compact_pattern_count > 0:
        return 'compact'
    elif desktop_pattern_count > mobile_pattern_count:
        return 'desktop'
    elif mobile_pattern_count > 0:
        return 'mobile'
    else:
        return 'unknown'

def split_chat_by_speaker_desktop(raw_text: str) -> List[Tuple[str, str]]:
    """Splits the desktop format chat log into blocks per speaker turn."""
    speaker_blocks = []
    current_speaker = ""
    current_block = []
    # Desktop format: [Speaker] [오전/오후 HH:MM] content
    speaker_line_re = re.compile(r'^\[([^\]]+)\]\s*\[(오전|오후)\s*\d{1,2}:\d{2}\]')

    for line in raw_text.splitlines():
        match = speaker_line_re.match(line)
        if match:
            # If a new speaker starts, save the previous block
            if current_speaker and current_block:
                speaker_blocks.append((current_speaker, "\n".join(current_block)))

            # Start a new block
            current_speaker = match.group(1)
            # The actual content of the line is after the matched tag
            content_line = line[match.end():].strip()
            current_block = [content_line] if content_line else []
        elif current_speaker: # This is a multi-line message
            current_block.append(line.strip())

    # Add the last block
    if current_speaker and current_block:
        speaker_blocks.append((current_speaker, "\n".join(current_block)))

    return speaker_blocks

def split_chat_by_speaker_mobile(raw_text: str) -> List[Tuple[str, str]]:
    """Splits the mobile format chat log into blocks per speaker turn."""
    speaker_blocks = []
    current_speaker = ""
    current_block = []

    # Mobile format: YYYY년 MM월 DD일 오전/오후 HH:MM, Speaker : content
    speaker_line_re = re.compile(r'^\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(오전|오후)\s*\d{1,2}:\d{2},\s*([^:]+)\s*:\s*(.*)')

    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue

        match = speaker_line_re.match(line)
        if match:
            # If a new speaker starts, save the previous block
            if current_speaker and current_block:
                speaker_blocks.append((current_speaker, "\n".join(current_block)))

            # Start a new block
            current_speaker = match.group(2).strip()
            content_line = match.group(3).strip()
            current_block = [content_line] if content_line else []
        elif current_speaker: # This is a multi-line message
            current_block.append(line)

    # Add the last block
    if current_speaker and current_block:
        speaker_blocks.append((current_speaker, "\n".join(current_block)))

    return speaker_blocks

def parse_compact_format(raw_text: str) -> List[Schedule]:
    """
    Parse compact format messages like:
    10월
    10월 25일 13시 하우스 천장근 이현주 - 박병찬 작가
    10월 26일 11시 이리스 신상목 최희재 - 박병찬 작가
    11월 15일 13시30분 이리스 컨벤션 김지환 김민정 - 박병찬 작가
    11월 22일 13:30시 이리스 서성준 배지원 - 박병찬 작가
    해운대 그랜드조선호텔 12시
    """
    schedules = []
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    current_month = None
    current_year = datetime.now().year  # 기본적으로 현재 연도 사용

    for line in lines:
        # 월 헤더 감지 (예: "10월")
        month_match = re.match(r'^(\d{1,2})월$', line)
        if month_match:
            current_month = int(month_match.group(1))
            continue

        # 패턴 1: MM월 DD일 HH시MM분 장소 신랑 신부 - 작가 (분 단위 포함)
        schedule_match = re.match(
            r'^(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시(\d{1,2})분\s+(.+?)\s+([가-힣]+)\s+([가-힣]+)\s*-\s*([가-힣]+)\s*작가',
            line
        )
        if schedule_match:
            month = int(schedule_match.group(1))
            day = int(schedule_match.group(2))
            hour = int(schedule_match.group(3))
            minute = int(schedule_match.group(4))
            location = schedule_match.group(5).strip()
            groom = schedule_match.group(6).strip()
            bride = schedule_match.group(7).strip()
            photographer = schedule_match.group(8).strip()

            if current_month is None:
                current_month = month

            date = f"{current_year}.{month:02d}.{day:02d}"
            time = f"{hour:02d}:{minute:02d}"
            couple = f"{groom} {bride}"

            schedule = Schedule(
                date=date, location=clean_location(location), time=time, couple=couple,
                photographer=photographer, manager="", brand="", album="",
                contact="", memo="", needs_review=True,
                review_reason="간결한 형식: 브랜드, 앨범, 계약자 정보 누락"
            )
            schedules.append(schedule)
            continue

        # 패턴 2: MM월 DD일 HH:MM시 장소 신랑 신부 - 작가 (콜론 형태)
        schedule_match = re.match(
            r'^(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2}):(\d{2})시\s+(.+?)\s+([가-힣]+)\s+([가-힣]+)\s*-\s*([가-힣]+)\s*작가',
            line
        )
        if schedule_match:
            month = int(schedule_match.group(1))
            day = int(schedule_match.group(2))
            hour = int(schedule_match.group(3))
            minute = int(schedule_match.group(4))
            location = schedule_match.group(5).strip()
            groom = schedule_match.group(6).strip()
            bride = schedule_match.group(7).strip()
            photographer = schedule_match.group(8).strip()

            if current_month is None:
                current_month = month

            date = f"{current_year}.{month:02d}.{day:02d}"
            time = f"{hour:02d}:{minute:02d}"
            couple = f"{groom} {bride}"

            schedule = Schedule(
                date=date, location=clean_location(location), time=time, couple=couple,
                photographer=photographer, manager="", brand="", album="",
                contact="", memo="", needs_review=True,
                review_reason="간결한 형식: 브랜드, 앨범, 계약자 정보 누락"
            )
            schedules.append(schedule)
            continue

        # 패턴 3: MM월 DD일 HH시 장소 신랑 신부 - 작가 (기본 형태)
        schedule_match = re.match(
            r'^(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시\s+(.+?)\s+([가-힣]+)\s+([가-힣]+)\s*-\s*([가-힣]+)\s*작가',
            line
        )
        if schedule_match:
            month = int(schedule_match.group(1))
            day = int(schedule_match.group(2))
            hour = int(schedule_match.group(3))
            location = schedule_match.group(4).strip()
            groom = schedule_match.group(5).strip()
            bride = schedule_match.group(6).strip()
            photographer = schedule_match.group(7).strip()

            if current_month is None:
                current_month = month

            date = f"{current_year}.{month:02d}.{day:02d}"
            time = f"{hour:02d}:00"
            couple = f"{groom} {bride}"

            schedule = Schedule(
                date=date, location=clean_location(location), time=time, couple=couple,
                photographer=photographer, manager="", brand="", album="",
                contact="", memo="", needs_review=True,
                review_reason="간결한 형식: 브랜드, 앨범, 계약자 정보 누락"
            )
            schedules.append(schedule)
            continue

        # 🤖 NLP 기반 유연한 파서 (패턴 4-7 및 FALLBACK 대체)
        try:
            extracted_schedule = nlp_parse_flexible_format(line, current_year)
            if extracted_schedule:
                schedules.append(extracted_schedule)
        except Exception as e:
            pass

    return schedules

def extract_korean_words(text: str) -> List[str]:
    """한글 단어만 추출 (간단한 토큰화)"""
    words = re.findall(r'[가-힣]{2,4}', text)
    return [word for word in words if word not in COMMON_WORDS]

def extract_location_smart(text: str) -> str:
    """스마트 장소 추출"""
    words = text.split()
    venue_parts = []

    for word in words:
        clean_word = word.replace('"', '').replace("'", '')

        if any(keyword in clean_word for keyword in LOCATION_KEYWORDS):
            venue_parts.append(clean_word)
        elif re.match(r'^[가-힣]{3,}$', clean_word) and clean_word not in COMMON_WORDS:
            venue_parts.append(clean_word)

    return ' '.join(location_parts[:2])

def extract_names_smart(text: str) -> List[str]:
    """스마트 이름 추출"""
    words = extract_korean_words(text)
    names = []

    for word in words:
        if 2 <= len(word) <= 4:
            if not any(keyword in word for keyword in LOCATION_KEYWORDS):
                if word not in ['컨벤션', '웨딩홀', '스몰웨딩']:
                    names.append(word)

    return list(set(names))

def extract_schedule_with_nlp(text: str) -> Dict[str, Any]:
    """가벼운 NLP 스타일 스케줄 정보 추출"""
    components = {
        'date': '', 'time': '', 'location': '', 'names': [], 'photographer': '', 'weekday': ''
    }

    # 시간 추출
    time_patterns = [r'(\d{1,2})시(\d{1,2})분', r'(\d{1,2}):(\d{2})', r'(\d{1,2})시']
    for pattern in time_patterns:
        match = re.search(pattern, text)
        if match:
            if len(match.groups()) == 2:
                hour, minute = match.groups()
                components['time'] = f"{int(hour):02d}:{int(minute):02d}"
            else:
                hour = match.group(1)
                components['time'] = f"{int(hour):02d}:00"
            break

    # 날짜 추출
    date_match = re.search(r'(\d{1,2})월\s*(\d{1,2})일', text)
    if date_match:
        month, day = date_match.groups()
        components['date'] = f"{int(month):02d}월 {int(day):02d}일"

    # 요일 추출
    for weekday_pattern, weekday_num in WEEKDAY_PATTERNS.items():
        if re.search(weekday_pattern, text):
            components['weekday'] = weekday_pattern.replace('?', '').replace('r\'', '').replace('\'', '')
            break

    # 장소, 이름 추출
    components['location'] = extract_location_smart(text)
    components['names'] = extract_names_smart(text)

    # 작가 추출
    if '작가' in text and components['names']:
        words = text.split()
        for i, word in enumerate(words):
            if '작가' in word and i > 0:
                prev_word = words[i-1].replace('-', '').strip()
                if prev_word in components['names']:
                    components['photographer'] = prev_word
                    break

    return components

def is_meaningful_schedule(text: str, components: Dict[str, Any]) -> bool:
    """의미있는 스케줄인지 판단하는 휴리스틱"""

    # 🚫 확실히 일반 문의인 경우들
    noise_patterns = [
        r'혹시나.*연락', r'문의.*드려', r'연락.*주세요', r'가능.*것.*있으면',
        r'\d+만원', r'촬영비', r'출장비', r'추가.*입니다', r'건당.*입니다'
    ]

    for pattern in noise_patterns:
        if re.search(pattern, text):
            return False

    # ✅ 시간이 있으면서 장소도 있는 경우 (가장 확실한 스케줄)
    if components['time'] and components['location']:
        return True

    # ✅ 완전한 날짜 정보가 있으면서 시간도 있는 경우
    if components['date'] and components['time']:
        return True

    # ✅ 작가 정보가 명시된 경우 (확실한 스케줄)
    if components['photographer'] and (components['time'] or components['location']):
        return True

    # 🚫 시간도 장소도 없으면 의미없음
    if not components['time'] and not components['location']:
        return False

    # 🚫 너무 짧은 텍스트 (5글자 미만)
    if len(text.strip()) < 5:
        return False

    # 🚫 일반적인 단어만 있는 경우
    meaningful_words = [word for word in text.split() if len(word) >= 2 and word not in COMMON_WORDS]
    if len(meaningful_words) < 2:
        return False

    return True

def nlp_parse_flexible_format(text: str, current_year: int = None) -> Optional[Schedule]:
    """spaCy 기반 고성능 NLP 스케줄 파싱"""
    if not nlp or not text or len(text.strip()) < 3:
        return None

    if current_year is None:
        current_year = datetime.now().year

    # 텍스트 전처리 및 정규화
    normalized_text = normalize_text_spacy(text)

    # spaCy로 개체명 추출
    entities = extract_entities_with_spacy(normalized_text)

    # 의미있는 스케줄인지 판단
    if not is_meaningful_schedule_spacy(normalized_text, entities):
        return None

    # 각 요소 추출
    date_str = extract_date_from_entities_spacy(entities, normalized_text, current_year)
    time_str = extract_time_from_entities_spacy(entities, normalized_text)
    location_str = extract_location_from_entities_spacy(entities, normalized_text)
    couple_str = extract_couple_from_entities_spacy(entities)

    # 브랜드/앨범 추출 (정규표현식)
    brand_str = extract_brand_from_text(normalized_text)

    # 최종 검증: 날짜나 시간 중 하나는 있어야 함
    if not date_str and not time_str:
        return None

    # 장소가 없으면 기본값
    if not location_str and time_str:
        location_str = "장소 미상"

    # 검토 필요성 판단
    review_reasons = []
    if not date_str:
        review_reasons.append("날짜 정보 없음")
    if not time_str:
        review_reasons.append("시간 정보 없음")
    if not location_str or location_str == "장소 미상":
        review_reasons.append("장소 정보 없음")
    if not couple_str:
        review_reasons.append("커플 정보 없음")

    needs_review = len(review_reasons) > 0
    review_reason = f"spaCy NLP: {', '.join(review_reasons)}" if review_reasons else "spaCy NLP"

    # 신랑신부 이름 분리 처리
    separated_couple = separate_couple_names(couple_str) if couple_str else ""

    return Schedule(
        date=date_str or "",
        location=clean_location(location_str) if location_str else "",
        time=time_str or "",
        couple=separated_couple,
        photographer="",
        manager="",
        brand=brand_str or "",
        album="",
        contact="",
        memo="",
        needs_review=needs_review,
        review_reason=review_reason
    )

def parse_flexible_format(text: str, current_year: int) -> Optional[Schedule]:
    """
    🚀 유연한 단어 추출/조합 방식 파서
    문장에서 단어들을 추출하고 조합하여 스케줄 정보 생성

    예시:
    - "11월29일 토요일 촬영 스케쥴 가능 한 것 있으면 연락 주세요"
    - "김해. 창원은 출장비 5만원 추가 입니다"
    - "김해메르시앙 12시"
    """
    if not text or len(text.strip()) < 3:
        return None

    # 🔍 단어 추출
    extracted_info = extract_schedule_components(text)

    # 📅 날짜 정보 처리
    date_str = ""
    if extracted_info['date']:
        date_str = format_date_to_standard(extracted_info['date'], current_year)
    elif extracted_info['weekday']:
        # 요일 기반 추측
        predicted_date = get_date_from_weekday(extracted_info['weekday'])
        if predicted_date:
            try:
                month_day = predicted_date.replace('월', '').replace('일', '')
                month, day = month_day.split()
                month, day = int(month), int(day)
                date_str = f"{current_year}.{month:02d}.{day:02d}"
            except:
                date_str = ""

    # 날짜가 없으면 기본값 (이번 주 토요일)
    if not date_str:
        predicted_date = get_next_saturday()
        try:
            month_day = predicted_date.replace('월', '').replace('일', '')
            month, day = month_day.split()
            month, day = int(month), int(day)
            date_str = f"{current_year}.{month:02d}.{day:02d}"
        except:
            date_str = ""

    # ⏰ 시간 정보 처리
    time_str = extracted_info['time'] or ""

    # 🏢 장소 정보 처리
    location_str = extracted_info['location'] or ""

    # 👥 커플 정보 처리
    couple_str = ""
    if extracted_info['names'] and len(extracted_info['names']) >= 2:
        couple_str = " ".join(extracted_info['names'][:2])  # 처음 두 이름

    # 📸 작가 정보 처리
    photographer_str = ""
    if extracted_info['photographer']:
        photographer_str = extracted_info['photographer']
    elif extracted_info['names'] and len(extracted_info['names']) >= 3:
        photographer_str = extracted_info['names'][-1]  # 마지막 이름

    # 최소 조건 확인: 날짜, 시간, 장소 중 하나는 있어야 함
    if not date_str and not location_str and not time_str:
        return None

    # 스케줄 관련 키워드가 있으면 더 관대하게 처리
    schedule_keywords = ['스케줄', '촬영', '가능', '연락', '예약']
    has_schedule_keyword = any(keyword in text.lower() for keyword in schedule_keywords)

    if has_schedule_keyword and not location_str and not time_str:
        location_str = "일반 문의"  # 키워드가 있으면 임시 장소 설정

    # 🔧 검토 이유 생성
    review_reasons = []
    if not date_str:
        review_reasons.append("날짜 추측됨")
    if not couple_str:
        review_reasons.append("커플 정보 없음")
    if not photographer_str:
        review_reasons.append("작가 정보 없음")
    if not location_str:
        review_reasons.append("장소 정보 없음")

    review_reason = f"유연한 파서: {', '.join(review_reasons)}" if review_reasons else ""

    # 신랑신부 이름 분리 처리
    separated_couple = separate_couple_names(couple_str) if couple_str else ""

    return Schedule(
        date=date_str,
        location=clean_location(location_str),
        time=time_str,
        couple=separated_couple,
        photographer=photographer_str,
        manager="", brand="", album="", contact="", memo="",
        needs_review=True,
        review_reason=review_reason
    )

def extract_schedule_components(text: str) -> Dict[str, Any]:
    """
    🔍 문장에서 스케줄 구성 요소들을 추출
    """
    components = {
        'date': None,
        'weekday': None,
        'time': None,
        'location': None,
        'names': [],
        'photographer': None
    }

    # 📅 날짜 추출
    date_patterns = [
        r'(\d{1,2})월(\d{1,2})일',  # MM월DD일
        r'(\d{4})[-./](\d{1,2})[-./](\d{1,2})',  # YYYY-MM-DD
        r'(\d{1,2})[-./](\d{1,2})'  # MM-DD
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            components['date'] = match.group(0)
            break

    # 📆 요일 추출
    weekday_match = re.search(r'([가-힣]요일?)', text)
    if weekday_match:
        components['weekday'] = weekday_match.group(1)

    # ⏰ 시간 추출
    time_patterns = [
        r'(\d{1,2}):(\d{2})',  # HH:MM
        r'(\d{1,2})시(\d{1,2})분',  # HH시MM분
        r'(\d{1,2})시(?!간)',  # HH시 (시간이 아닌 경우)
    ]
    for pattern in time_patterns:
        match = re.search(pattern, text)
        if match:
            if len(match.groups()) == 2:
                hour, minute = match.groups()
                components['time'] = f"{int(hour):02d}:{int(minute):02d}"
            else:
                hour = match.group(1)
                components['time'] = f"{int(hour):02d}:00"
            break

    # 🏢 장소 추출 (한글 장소명)
    venue_patterns = [
        r'([가-힣]{2,}(?:호텔|센터|컨벤션|웨딩홀|교회|성당|예식장|리조트|펜션))',
        r'([가-힣]{2,}(?:메르시앙|그랜드|조선|롯데|신라|하얏트|힐튼))',
        r'([가-힣]+(?:\s*["\']?[a-zA-Z0-9가-힣]+["\']?)?(?:홀|룸|관|동))',
    ]
    for pattern in venue_patterns:
        matches = re.findall(pattern, text)
        if matches:
            components['location'] = matches[0]
            break

    # 🏢 지역명 기반 장소 추출
    if not components['location']:
        location_pattern = r'(김해|창원|부산|해운대|센텀|광주|대구|서울|인천|대전)(?:\s*[가-힣]*)?'
        location_match = re.search(location_pattern, text)
        if location_match:
            components['location'] = location_match.group(0).strip()

    # 🏢 일반적인 장소 키워드들 추출
    if not components['location']:
        general_venue_keywords = ['촬영', '스케줄', '웨딩', '예식']
        for keyword in general_venue_keywords:
            if keyword in text:
                components['location'] = f'{keyword} 관련'
                break

    # 👥 인명 추출 (한글 2-4글자)
    name_patterns = [
        r'([가-힣]{2,4})\s+([가-힣]{2,4})\s*-\s*([가-힣]+)\s*작가',  # 신랑 신부 - 작가
        r'([가-힣]{2,4})',  # 일반적인 한글 이름
    ]

    # 작가 패턴 우선 확인
    photographer_match = re.search(r'([가-힣]+)\s*작가', text)
    if photographer_match:
        components['photographer'] = photographer_match.group(1)

    # 일반 이름들 추출
    names = []
    for name_match in re.finditer(r'[가-힣]{2,4}', text):
        name = name_match.group(0)
        # 일반적이지 않은 단어들 제외
        if name not in ['스케줄', '촬영', '연락', '출장비', '만원', '추가', '입니다', '있으면', '주세요', '가능']:
            names.append(name)

    components['names'] = list(set(names))  # 중복 제거

    return components

def format_date_to_standard(date_str: str, current_year: int) -> str:
    """날짜 문자열을 YYYY.MM.DD 형식으로 변환"""
    try:
        # MM월DD일 형식
        if '월' in date_str and '일' in date_str:
            date_clean = date_str.replace('월', '').replace('일', '')
            if ' ' in date_clean:
                month, day = date_clean.split()
            else:
                # 11월29일 같은 형식에서 숫자 분리
                match = re.match(r'(\d{1,2})(\d{1,2})$', date_clean)
                if match and len(date_clean) <= 4:
                    month, day = match.groups()
                else:
                    return ""

            month, day = int(month), int(day)
            return f"{current_year}.{month:02d}.{day:02d}"

        # YYYY-MM-DD 또는 MM-DD 형식
        elif '-' in date_str or '.' in date_str or '/' in date_str:
            parts = re.split(r'[-./]', date_str)
            if len(parts) == 3:
                return f"{parts[0]}.{int(parts[1]):02d}.{int(parts[2]):02d}"
            elif len(parts) == 2:
                return f"{current_year}.{int(parts[0]):02d}.{int(parts[1]):02d}"
    except:
        pass

    return ""

def split_chat_by_speaker(raw_text: str) -> List[Tuple[str, str]]:
    """
    Splits the raw chat log into blocks per speaker turn.
    Automatically detects format (desktop/mobile) and uses appropriate parser.
    """
    chat_format = detect_chat_format(raw_text)

    if chat_format == 'compact':
        # Compact format doesn't have speakers, return empty list
        return []
    elif chat_format == 'desktop':
        return split_chat_by_speaker_desktop(raw_text)
    elif chat_format == 'mobile':
        return split_chat_by_speaker_mobile(raw_text)
    else:
        # Fallback to desktop format for backward compatibility
        return split_chat_by_speaker_desktop(raw_text)

def find_manager_speaker(speaker_blocks: List[Tuple[str, str]]) -> str:
    """Find the most likely manager speaker by analyzing content patterns."""
    # Look for speakers with schedule-like content (dates, venues, etc.)
    speaker_schedule_counts = {}

    for speaker, content in speaker_blocks:
        schedule_indicators = 0
        lines = content.split('\n')

        for line in lines:
            line = line.strip()
            # Count date patterns
            if re.match(r'^\d{4}\.\d{2}\.\d{2}$', line):
                schedule_indicators += 3  # High weight for dates
            # Count time patterns
            elif re.match(r'^\d{2}:\d{2}$', line):
                schedule_indicators += 2  # Medium weight for times
            # Count brand patterns
            elif any(re.search(pattern, line) for pattern in BRAND_PATTERNS):
                schedule_indicators += 2  # Medium weight for brands
            # Count location-like patterns (contains 홀, 층, etc.)
            elif any(keyword in line for keyword in ['홀', '층', '컨벤션', '웨딩', '더']):
                schedule_indicators += 1  # Low weight for venues

        if schedule_indicators > 0:
            speaker_schedule_counts[speaker] = schedule_indicators

    # Return the speaker with the most schedule-like content
    if speaker_schedule_counts:
        return max(speaker_schedule_counts, key=speaker_schedule_counts.get)

    # Fallback to MANAGER_NAME if no clear manager found
    return MANAGER_NAME

def parse_manager_block(block_text: str) -> List[Schedule]:
    """Parses a single text block from the manager, which might contain multiple schedules."""
    schedules = []
    current_year = datetime.now().year  # NLP 파서용 현재 연도
    lines = [line.strip() for line in block_text.splitlines() if line.strip() and not line.startswith('---')]
    
    # Find all schedule start indices (line 1 of the 4-line core)
    start_indices = []
    for i, line in enumerate(lines):
        if is_valid_date(line):
            start_indices.append(i)
            # Extract and use the clean date
            clean_date = extract_date(line)
            if clean_date:
                lines[i] = clean_date


    # 일반적인 스케줄 패턴이 없으면 NLP 파서로 전체 텍스트 처리
    if not start_indices:
        try:
            extracted_schedule = nlp_parse_flexible_format(block_text, current_year)
            if extracted_schedule:
                return [extracted_schedule]
        except Exception as e:
            pass
        return []

    for i, start_idx in enumerate(start_indices):
        # Determine the end of the current schedule block
        end_idx = start_indices[i+1] if (i + 1) < len(start_indices) else len(lines)
        schedule_lines = lines[start_idx:end_idx]

        if len(schedule_lines) < 4: continue

        # Core 4-line block validation
        date, location, time, couple = schedule_lines[0], schedule_lines[1], schedule_lines[2], schedule_lines[3]
        if not (is_valid_date(date) and is_valid_time(time) and is_valid_couple(couple)):
            continue

        # 신랑신부 이름 분리 처리
        separated_couple = separate_couple_names(couple)
        sch = Schedule(date=date, location=clean_location(location), time=time, couple=separated_couple)
        
        # Subtractive parsing on the rest of the lines
        remaining_lines = schedule_lines[4:]
        processed_indices = set()

        if remaining_lines:
            sch.manager = remaining_lines.pop(-1).strip()
            # Standardize contractor names
            if '그랜드 블랑' in sch.manager:
                sch.manager = sch.manager.replace('그랜드 블랑', '그랜드블랑')

        # First, check for contact number in the first line only (right after couple names)
        if remaining_lines:
            contact = parse_contact(remaining_lines[0])
            if contact:
                sch.contact = contact
                processed_indices.add(0)

        j = 0
        while j < len(remaining_lines):
            line = remaining_lines[j]
            is_known_pattern = False

            # Skip contact parsing since we already handled it above
            if j == 0 and sch.contact:
                is_known_pattern = True

            brand, album = parse_brand_album(line)
            if brand or album:
                if brand: sch.brand = brand
                if album: sch.album = album
                processed_indices.add(j); is_known_pattern = True

            # Extract photographer name by removing contact and role info
            name_part = re.sub(r'010[- .]?\d{4}[- .]?\d{4}', '', line).strip()
            name_part = re.sub(r'\([^)]*\)', '', name_part).strip()  # Remove parentheses content like (메인), (서브)
            name_part = re.sub(r'‭|‬', '', name_part).strip()  # Remove invisible characters

            if is_valid_photographer_name(name_part):
                photographers = [name_part]
                processed_indices.add(j); is_known_pattern = True

                # Check next line for additional photographer
                if (j + 1) < len(remaining_lines):
                    next_line = remaining_lines[j+1]
                    next_name_part = re.sub(r'010[- .]?\d{4}[- .]?\d{4}', '', next_line).strip()
                    next_name_part = re.sub(r'\([^)]*\)', '', next_name_part).strip()
                    next_name_part = re.sub(r'‭|‬', '', next_name_part).strip()

                    if is_valid_photographer_name(next_name_part):
                        photographers.append(next_name_part)
                        processed_indices.add(j + 1)
                        j += 1  # Skip next line since we processed it

                sch.photographer = ", ".join(photographers)
                is_known_pattern = True

            # Only mark as needs_review if line is not empty and not a known pattern
            # We'll handle comments content separately
            if not is_known_pattern and line.strip():
                sch.needs_review = True
                if not sch.review_reason:
                    sch.review_reason = "알 수 없는 내용"

            j += 1

        # Create comments from unprocessed lines
        sch.memo = "\n".join(remaining_lines[k] for k in range(len(remaining_lines)) if k not in processed_indices).strip()

        # If we have comments content, it means there were unprocessed lines
        # Reset needs_review to False since comments content is intentional
        if sch.memo:
            sch.needs_review = False
            sch.review_reason = ""

        # Mark for review if critical fields are missing
        missing_fields = []
        if not sch.brand: missing_fields.append("브랜드")
        if not sch.album: missing_fields.append("앨범")
        if not sch.photographer: missing_fields.append("작가")
        if not sch.manager: missing_fields.append("계약자")

        if missing_fields:
            sch.needs_review = True
            sch.review_reason = f"필수 필드 누락: {', '.join(missing_fields)}"

        # 촬영단가 자동 계산 (파싱할 때만)
        if sch.brand and sch.album and sch.date:
            sch.price = calculate_price(sch.brand, sch.album, sch.date)

        schedules.append(sch)

    return schedules

def get_schedule_completeness_score(schedule: Schedule) -> int:
    """Calculate completeness score for data integrity comparison."""
    score = 0

    # Core fields (must exist for basic validity)
    if schedule.date and extract_date(schedule.date): score += 10
    if schedule.location: score += 5
    if schedule.time and is_valid_time(schedule.time): score += 10
    if schedule.couple and is_valid_couple(schedule.couple): score += 10

    # Critical fields for business logic
    if schedule.brand: score += 8
    if schedule.album: score += 8
    if schedule.photographer: score += 8
    if schedule.manager: score += 8

    # Optional but valuable fields
    if schedule.contact and parse_contact(schedule.contact): score += 5
    if schedule.memo: score += 2

    return score

def is_better_schedule(existing: Schedule, new: Schedule) -> bool:
    """
    Determine if new schedule is better than existing one.
    Returns True if new schedule should replace existing one.
    """
    existing_score = get_schedule_completeness_score(existing)
    new_score = get_schedule_completeness_score(new)

    # If new schedule has significantly higher completeness, use it
    if new_score > existing_score:
        return True

    # If scores are equal, prefer the one without needs_review flag
    if new_score == existing_score:
        if existing.needs_review and not new.needs_review:
            return True
        # If both have same review status, prefer the new one (latest wins for ties)
        if existing.needs_review == new.needs_review:
            return True
        return False

    # If new score is lower, keep existing
    return False

def calculate_price(brand: str, album: str, date: str) -> int:
    """
    브랜드와 앨범, 날짜에 따라 촬영단가를 계산합니다.

    Args:
        brand: 브랜드명 (K세븐스, B세븐스, A세븐스프리미엄, 더그라피, 세컨플로우)
        album: 앨범 타입 (30P, 40P, 50P 등)
        date: 촬영 날짜 (YYYY.MM.DD 형식)

    Returns:
        int: 촬영단가 (숫자만)
    """
    try:
        # 날짜 파싱 (2025.09.01 기준 단가 변경)
        schedule_date = datetime.strptime(date, '%Y.%m.%d')
        price_change_date = datetime(2025, 9, 1)
        is_after_sep_2025 = schedule_date >= price_change_date

        # 브랜드명 정규화
        brand_lower = brand.lower().replace(' ', '').replace('[', '').replace(']', '')

        # 앨범에서 숫자 추출 (30P, 40P, 50P 등)
        album_match = re.search(r'(\d+)[Pp]', album)
        album_pages = int(album_match.group(1)) if album_match else 30

        # K세븐스
        if 'k세븐스' in brand_lower:
            return 140000 if is_after_sep_2025 else 150000

        # B세븐스 (K세븐스 + 2만원)
        elif 'b세븐스' in brand_lower:
            k_price = 140000 if is_after_sep_2025 else 150000
            return k_price + 20000

        # A세븐스프리미엄
        elif 'a세븐스프리미엄' in brand_lower:
            return 190000

        # 더그라피, 세컨플로우
        elif '더그라피' in brand_lower or '세컨플로우' in brand_lower:
            if album_pages <= 30:
                return 170000
            elif album_pages <= 40:
                return 190000 if is_after_sep_2025 else 200000
            elif album_pages >= 50:
                return 240000 if is_after_sep_2025 else 250000
            else:
                return 170000  # 기본값

        # 알 수 없는 브랜드
        else:
            return 0

    except (ValueError, AttributeError):
        # 날짜 파싱 실패 시 기본값 반환
        return 0

def parse_schedules(raw_text: str) -> List[Dict]:
    """Main entry point for parsing schedules from a raw chat log."""
    # Detect format first
    chat_format = detect_chat_format(raw_text)

    # Handle compact format directly
    if chat_format == 'compact':
        parsed_schedules = parse_compact_format(raw_text)
        return [sch.to_dict() for sch in parsed_schedules]

    # Handle chat formats (desktop/mobile)
    speaker_blocks = split_chat_by_speaker(raw_text)

    # If no speaker blocks found (plain text input), treat the whole text as one block
    if not speaker_blocks:
        parsed_schedules = parse_manager_block(raw_text)
        return [sch.to_dict() for sch in parsed_schedules]

    # Automatically find the manager speaker
    manager_speaker = find_manager_speaker(speaker_blocks)

    # Use a dictionary to handle duplicates and merge if necessary
    final_schedules: Dict[str, Schedule] = {}

    for speaker, content in speaker_blocks:
        if speaker == manager_speaker:
            parsed_schedules = parse_manager_block(content)
            for sch in parsed_schedules:
                key = f"{sch.date}-{sch.time}-{sch.couple}"

                if key not in final_schedules:
                    # First occurrence, just add it
                    final_schedules[key] = sch
                else:
                    # Duplicate found, compare and choose better one
                    if is_better_schedule(final_schedules[key], sch):
                        final_schedules[key] = sch

    return [sch.to_dict() for sch in final_schedules.values()]


# === spaCy NLP Helper Functions ===

def normalize_text_spacy(text: str) -> str:
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

    doc = nlp(text)

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

def extract_date_from_entities_spacy(entities: Dict[str, List[str]], text: str, current_year: int) -> Optional[str]:
    """개체명에서 날짜 추출 및 정규화"""
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

def extract_time_from_entities_spacy(entities: Dict[str, List[str]], text: str) -> Optional[str]:
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

def extract_location_from_entities_spacy(entities: Dict[str, List[str]], text: str) -> Optional[str]:
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

def extract_couple_from_entities_spacy(entities: Dict[str, List[str]]) -> Optional[str]:
    """개체명에서 신랑신부 추출"""
    persons = entities.get('persons', [])
    if len(persons) >= 2:
        # 두 명 이상의 인명이 있으면 신랑신부로 간주
        return ' '.join(persons[:2])
    elif len(persons) == 1:
        return persons[0]

    return None

def extract_brand_from_text(text: str) -> Optional[str]:
    """텍스트에서 브랜드/앨범 추출"""
    brand_patterns = [
        r'앨범[:\s]*([가-힣A-Za-z\s\-]+)',
        r'브랜드[:\s]*([가-힣A-Za-z\s\-]+)',
        r'(그래피|K세븐스|비세븐스|에이프리미엄|세컨드플로우)'
    ]

    for pattern in brand_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()

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

    # 최소 2개 이상의 핵심 요소가 있어야 의미있는 스케줄
    core_elements = sum([has_date, has_time, has_venue])

    return core_elements >= 2


# === Parser Engine Selection Functions ===

def has_required_fields(schedule: Dict) -> bool:
    """
    필수 필드 4개(날짜, 시간, 장소, 신랑신부)가 모두 있는지 확인

    Args:
        schedule: 검증할 스케줄 딕셔너리

    Returns:
        bool: 필수 필드가 모두 있으면 True, 하나라도 없으면 False
    """
    return bool(
        schedule.get('date') and
        schedule.get('time') and
        schedule.get('location') and
        schedule.get('couple')
    )

def parse_schedules_hybrid_llm(raw_text: str) -> List[Dict]:
    """
    하이브리드 파서 (Classic + GPT-4)
    먼저 Classic 파서를 시도하고, 필수 필드 4개(날짜, 시간, 장소, 신랑신부)를 파싱하지 못했으면 GPT-4 파서로 fallback
    """
    import logging
    logger = logging.getLogger(__name__)

    # 먼저 Classic 시도
    logger.info("Hybrid: Trying Classic parser first...")
    classic_result = parse_schedules_classic_only(raw_text)

    # Classic이 성공했으면 필수 필드 검증
    if classic_result and len(classic_result) > 0:
        # 에러 응답이 아닌지 확인
        if not isinstance(classic_result, dict) or not classic_result.get('error'):
            # 모든 스케줄이 필수 필드 4개(날짜, 시간, 장소, 신랑신부)를 가지고 있는지 확인
            all_have_required = all(has_required_fields(sch) for sch in classic_result)

            if all_have_required:
                logger.info(f"Hybrid: Classic parser succeeded with {len(classic_result)} schedules (all have required fields)")
                return classic_result
            else:
                # 필수 필드가 누락된 스케줄 로깅
                missing_count = sum(1 for sch in classic_result if not has_required_fields(sch))
                logger.info(f"Hybrid: Classic parser returned {len(classic_result)} schedules, but {missing_count} are missing required fields")

    # Classic이 실패하거나 결과가 없거나 필수 필드가 누락된 경우 GPT-4 시도
    logger.info("Hybrid: Classic parser failed or missing required fields. Falling back to GPT-4...")
    return parse_schedules_llm(raw_text)

def parse_schedules_llm(raw_text: str) -> List[Dict]:
    """
    GPT-4 기반 파서 (OpenAI GPT-4.1-nano)
    GPT-4가 Classic parser 형식으로 변환 → Classic parser가 즉시 재파싱
    """
    try:
        from services.llm_parser import parse_with_llm
        import asyncio
        import logging
        logger = logging.getLogger(__name__)

        # async 함수 실행: GPT-4가 Classic parser 형식으로 변환
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        converted_text = loop.run_until_complete(parse_with_llm(raw_text))
        loop.close()

        if not converted_text:
            logger.error("GPT-4 conversion returned empty result")
            return []

        logger.info(f"GPT-4 converted text to Classic format ({len(converted_text)} chars)")
        logger.debug(f"Converted text:\n{converted_text}")

        # Classic parser로 즉시 재파싱
        logger.info("Re-parsing with Classic parser...")
        parsed_schedules = parse_schedules_classic_only(converted_text)

        logger.info(f"Classic parser found {len(parsed_schedules)} schedules")
        return parsed_schedules

    except ImportError:
        return {"error": "LLM 파서를 사용할 수 없습니다. OpenAI 패키지가 설치되어 있는지 확인하세요.", "success": False}
    except Exception as e:
        return {"error": f"LLM 파서 오류: {str(e)}", "success": False}

def parse_schedules_classic_only(raw_text: str) -> List[Dict]:
    """클래식 파서만 사용 (패턴 1-3만, NLP 비활성화)"""
    chat_format = detect_chat_format(raw_text)

    if chat_format == 'compact':
        parsed_schedules = parse_compact_format(raw_text)
        return [sch.to_dict() for sch in parsed_schedules]

    speaker_blocks = split_chat_by_speaker(raw_text)

    if not speaker_blocks:
        # 일반 텍스트인 경우 클래식 패턴만 시도
        parsed_schedules = parse_manager_block_classic_only(raw_text)
        return [sch.to_dict() for sch in parsed_schedules]

    manager_speaker = find_manager_speaker(speaker_blocks)
    final_schedules: Dict[str, Schedule] = {}

    for speaker, content in speaker_blocks:
        if speaker == manager_speaker:
            parsed_schedules = parse_manager_block_classic_only(content)
            for sch in parsed_schedules:
                key = f"{sch.date}-{sch.time}-{sch.couple}"
                if key not in final_schedules:
                    final_schedules[key] = sch
                else:
                    if is_better_schedule(final_schedules[key], sch):
                        final_schedules[key] = sch

    return [sch.to_dict() for sch in final_schedules.values()]

def parse_schedules_ai_only(raw_text: str) -> List[Dict]:
    """AI/spaCy 파서만 사용"""
    if not nlp:
        return {"error": "spaCy NLP 모델이 로드되지 않았습니다.", "success": False}

    try:
        current_year = datetime.now().year
        extracted_schedule = nlp_parse_flexible_format(raw_text, current_year)
        if extracted_schedule:
            return [extracted_schedule.to_dict()]
        else:
            return []
    except Exception as e:
        return {"error": f"AI 파서 오류: {str(e)}", "success": False}

def parse_manager_block_classic_only(block_text: str) -> List[Schedule]:
    """클래식 패턴만 사용하는 parse_manager_block"""
    schedules = []
    current_year = datetime.now().year
    lines = [line.strip() for line in block_text.splitlines() if line.strip() and not line.startswith('---')]

    # Find all schedule start indices (line 1 of the 4-line core)
    start_indices = []
    for i, line in enumerate(lines):
        if is_valid_date(line):
            start_indices.append(i)
            clean_date = extract_date(line)
            if clean_date:
                lines[i] = clean_date

    # 클래식 모드에서는 NLP 파서 호출 안함
    if not start_indices:
        return []

    for i, start_idx in enumerate(start_indices):
        end_idx = start_indices[i+1] if (i + 1) < len(start_indices) else len(lines)
        schedule_lines = lines[start_idx:end_idx]

        if len(schedule_lines) < 4:
            continue

        # Core 4-line block validation
        date, location, time, couple = schedule_lines[0], schedule_lines[1], schedule_lines[2], schedule_lines[3]
        if not (is_valid_date(date) and is_valid_time(time) and is_valid_couple(couple)):
            continue

        # 신랑신부 이름 분리 처리
        separated_couple = separate_couple_names(couple)
        sch = Schedule(date=date, location=clean_location(location), time=time, couple=separated_couple)

        # Subtractive parsing on the rest of the lines
        remaining_lines = schedule_lines[4:]
        processed_indices = set()

        if remaining_lines:
            sch.manager = remaining_lines.pop(-1).strip()
            # Standardize contractor names
            if '그랜드 블랑' in sch.manager:
                sch.manager = sch.manager.replace('그랜드 블랑', '그랜드블랑')

        # First, check for contact number in the first line only (right after couple names)
        if remaining_lines:
            contact = parse_contact(remaining_lines[0])
            if contact:
                sch.contact = contact
                processed_indices.add(0)

        j = 0
        while j < len(remaining_lines):
            line = remaining_lines[j]
            is_known_pattern = False

            # Skip contact parsing since we already handled it above
            if j == 0 and sch.contact:
                is_known_pattern = True

            brand, album = parse_brand_album(line)
            if brand or album:
                if brand: sch.brand = brand
                if album: sch.album = album
                processed_indices.add(j); is_known_pattern = True

            # Extract photographer name by removing contact and role info
            name_part = re.sub(r'010[- .]?\d{4}[- .]?\d{4}', '', line).strip()
            name_part = re.sub(r'\([^)]*\)', '', name_part).strip()  # Remove parentheses content like (메인), (서브)
            name_part = re.sub(r'‭|‬', '', name_part).strip()  # Remove invisible characters

            if is_valid_photographer_name(name_part):
                photographers = [name_part]
                processed_indices.add(j); is_known_pattern = True

                # Check next line for additional photographer
                if (j + 1) < len(remaining_lines):
                    next_line = remaining_lines[j+1]
                    next_name_part = re.sub(r'010[- .]?\d{4}[- .]?\d{4}', '', next_line).strip()
                    next_name_part = re.sub(r'\([^)]*\)', '', next_name_part).strip()
                    next_name_part = re.sub(r'‭|‬', '', next_name_part).strip()

                    if is_valid_photographer_name(next_name_part):
                        photographers.append(next_name_part)
                        processed_indices.add(j + 1)
                        j += 1  # Skip next line since we processed it

                sch.photographer = ", ".join(photographers)
                is_known_pattern = True

            # Only mark as needs_review if line is not empty and not a known pattern
            # We'll handle comments content separately
            if not is_known_pattern and line.strip():
                sch.needs_review = True
                if not sch.review_reason:
                    sch.review_reason = "알 수 없는 내용"

            j += 1

        # Create comments from unprocessed lines
        sch.memo = "\n".join(remaining_lines[k] for k in range(len(remaining_lines)) if k not in processed_indices).strip()

        # If we have comments content, it means there were unprocessed lines
        # Reset needs_review to False since comments content is intentional
        if sch.memo:
            sch.needs_review = False
            sch.review_reason = ""

        # Mark for review if critical fields are missing
        missing_fields = []
        if not sch.brand: missing_fields.append("브랜드")
        if not sch.album: missing_fields.append("앨범")
        if not sch.photographer: missing_fields.append("작가")
        if not sch.manager: missing_fields.append("계약자")

        if missing_fields:
            sch.needs_review = True
            sch.review_reason = f"필수 필드 누락: {', '.join(missing_fields)}"

        # 촬영단가 자동 계산 (클래식 파서에서도)
        if sch.brand and sch.album and sch.date:
            sch.price = calculate_price(sch.brand, sch.album, sch.date)

        schedules.append(sch)

        # 클래식 패턴 1-3만 적용
        for line in lines:
            # 패턴 1: MM월 DD일 HH시MM분 장소 신랑 신부 - 작가
            schedule_match = re.match(
                r'^(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시(\d{1,2})분\s+(.+?)\s+([가-힣]+)\s+([가-힣]+)\s*-\s*([가-힣]+)\s*작가',
                line
            )
            if schedule_match:
                month, day, hour, minute, location, groom, bride, photographer = schedule_match.groups()
                month, day, hour, minute = int(month), int(day), int(hour), int(minute)

                date = f"{current_year}.{month:02d}.{day:02d}"
                time = f"{hour:02d}:{minute:02d}"
                couple = f"{groom} {bride}"

                schedule = Schedule(
                    date=date, location=clean_location(location), time=time, couple=couple,
                    photographer=photographer, manager="", brand="", album="",
                    contact="", memo="", needs_review=True,
                    review_reason="간결한 형식: 브랜드, 앨범, 계약자 정보 누락"
                )
                schedules.append(schedule)
                continue

            # 패턴 2: MM월 DD일 HH:MM시 장소 신랑 신부 - 작가 (콜론 형태)
            schedule_match = re.match(
                r'^(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2}):(\d{2})시\s+(.+?)\s+([가-힣]+)\s+([가-힣]+)\s*-\s*([가-힣]+)\s*작가',
                line
            )
            if schedule_match:
                month, day, hour, minute, location, groom, bride, photographer = schedule_match.groups()
                month, day, hour, minute = int(month), int(day), int(hour), int(minute)

                date = f"{current_year}.{month:02d}.{day:02d}"
                time = f"{hour:02d}:{minute:02d}"
                couple = f"{groom} {bride}"

                schedule = Schedule(
                    date=date, location=clean_location(location), time=time, couple=couple,
                    photographer=photographer, manager="", brand="", album="",
                    contact="", memo="", needs_review=True,
                    review_reason="간결한 형식: 브랜드, 앨범, 계약자 정보 누락"
                )
                schedules.append(schedule)
                continue

            # 패턴 3: MM월 DD일 HH시 장소 신랑 신부 - 작가 (기본 형태)
            schedule_match = re.match(
                r'^(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시\s+(.+?)\s+([가-힣]+)\s+([가-힣]+)\s*-\s*([가-힣]+)\s*작가',
                line
            )
            if schedule_match:
                month, day, hour, location, groom, bride, photographer = schedule_match.groups()
                month, day, hour = int(month), int(day), int(hour)

                date = f"{current_year}.{month:02d}.{day:02d}"
                time = f"{hour:02d}:00"
                couple = f"{groom} {bride}"

                schedule = Schedule(
                    date=date, location=clean_location(location), time=time, couple=couple,
                    photographer=photographer, manager="", brand="", album="",
                    contact="", memo="", needs_review=True,
                    review_reason="간결한 형식: 브랜드, 앨범, 계약자 정보 누락"
                )
                schedules.append(schedule)
                continue

    return schedules