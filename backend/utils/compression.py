"""압축 및 해제 유틸리티"""

import gzip
import base64
import json
from typing import Tuple, Any


def compress_json_data(data: Any) -> Tuple[str, int, int]:
    """
    JSON 데이터를 gzip 압축 후 Base64 인코딩
    Google Drive 저장용 압축 함수

    Args:
        data: 압축할 JSON 직렬화 가능한 데이터

    Returns:
        Tuple[str, int, int]: (압축된 Base64 문자열, 원본 크기, 압축 크기)
    """
    try:
        # JSON 문자열로 변환
        json_str = json.dumps(data, ensure_ascii=False, indent=2)

        # UTF-8로 인코딩 후 gzip 압축
        json_bytes = json_str.encode('utf-8')
        compressed_bytes = gzip.compress(json_bytes)

        # Base64 인코딩
        compressed_b64 = base64.b64encode(compressed_bytes).decode('ascii')

        # 압축 통계 계산
        original_size = len(json_bytes)
        compressed_size = len(compressed_bytes)
        compression_ratio = (compressed_size / original_size * 100) if original_size > 0 else 100

        print(f"📦 데이터 압축 완료: {original_size}B → {compressed_size}B ({compression_ratio:.1f}%)")

        return compressed_b64, original_size, compressed_size
    except Exception as e:
        print(f"❌ 압축 실패: {e}")
        raise e


def decompress_json_data(compressed_b64: str) -> Any:
    """
    Base64 압축 데이터를 해제하여 JSON으로 복원
    Google Drive 로드용 해제 함수

    Args:
        compressed_b64: Base64로 인코딩된 압축 문자열

    Returns:
        Any: 복원된 JSON 데이터
    """
    try:
        # Base64 디코딩
        compressed_bytes = base64.b64decode(compressed_b64)

        # gzip 해제
        decompressed_bytes = gzip.decompress(compressed_bytes)

        # JSON 파싱
        json_str = decompressed_bytes.decode('utf-8')
        return json.loads(json_str)
    except Exception as e:
        print(f"❌ 압축 해제 실패: {e}")
        raise e


def save_json_compressed(data: Any, file_path: str) -> None:
    """
    JSON 데이터를 gzip으로 압축하여 파일에 저장

    Args:
        data: 저장할 JSON 직렬화 가능한 데이터
        file_path: 저장할 파일 경로 (.gz 확장자 제외)
    """
    with gzip.open(f"{file_path}.gz", 'wt', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json_compressed(file_path: str) -> Any:
    """
    gzip 압축된 JSON 파일 로드

    Args:
        file_path: 로드할 파일 경로 (.gz 확장자 제외)

    Returns:
        Any: 로드된 JSON 데이터
    """
    with gzip.open(f"{file_path}.gz", 'rt', encoding='utf-8') as f:
        return json.load(f)


def save_json_regular(data: Any, file_path: str) -> None:
    """
    JSON 데이터를 압축 없이 파일에 저장

    Args:
        data: 저장할 JSON 직렬화 가능한 데이터
        file_path: 저장할 파일 경로
    """
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
