"""메타데이터 유틸리티"""

from typing import List, Dict, Any, Optional
from datetime import datetime


def calculate_checksum(schedules: List[Dict[str, Any]]) -> str:
    """
    스케줄 데이터의 체크섬 계산

    Args:
        schedules: 스케줄 데이터 리스트

    Returns:
        str: 계산된 체크섬 문자열
    """
    try:
        # 스케줄을 정규화하고 정렬
        sorted_schedules = []
        for s in schedules:
            normalized = f"{s.get('date', '')}-{s.get('time', '')}-{s.get('couple', '')}"
            sorted_schedules.append(normalized)

        sorted_schedules.sort()
        combined = '|'.join(sorted_schedules)

        # 간단한 해시 함수 (프론트엔드와 동일)
        hash_value = 0
        for char in combined:
            hash_value = ((hash_value << 5) - hash_value) + ord(char)
            hash_value = hash_value & 0xFFFFFFFF  # 32비트 정수로 제한

        return str(hash_value)
    except Exception as e:
        print(f"❌ 체크섬 계산 실패: {e}")
        return "0"


def create_metadata(
    schedules: List[Dict[str, Any]],
    timestamp: datetime,
    version: str,
    user_id: str,
    original_size: int,
    compressed_size: int,
    device_uuid: Optional[str] = None
) -> Dict[str, Any]:
    """
    메타데이터 생성

    Args:
        schedules: 스케줄 데이터 리스트
        timestamp: 생성 시간
        version: 버전 문자열
        user_id: 사용자 ID
        original_size: 원본 데이터 크기
        compressed_size: 압축된 데이터 크기
        device_uuid: 디바이스 UUID (선택)

    Returns:
        Dict[str, Any]: 생성된 메타데이터
    """
    metadata = {
        "timestamp": timestamp.isoformat(),
        "version": version,
        "user_id": user_id,
        "checksum": calculate_checksum(schedules),
        "count": len(schedules),
        "original_size": original_size,
        "compressed_size": compressed_size
    }

    # 디바이스 UUID가 있으면 메타데이터에 추가
    if device_uuid:
        metadata["device_uuid"] = device_uuid

    return metadata
