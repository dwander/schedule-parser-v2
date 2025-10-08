"""파일 유틸리티"""

import os


def get_file_size_mb(file_path: str) -> float:
    """
    파일 크기를 MB 단위로 반환

    Args:
        file_path: 파일 경로

    Returns:
        float: 파일 크기 (MB)
    """
    try:
        return os.path.getsize(file_path) / (1024 * 1024)
    except Exception:
        return 0
