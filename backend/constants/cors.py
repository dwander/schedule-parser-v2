"""
CORS 설정 상수
"""

# 개발 환경 Origins
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

# 프로덕션 Origins (Railway 및 커스텀 도메인)
PRODUCTION_ORIGINS = [
    "https://bs-snaper-frontend.up.railway.app",
    "https://bs-snaper-backend.up.railway.app",
    "https://bs-snaper-frontend-test.up.railway.app",
    "https://bs-snaper-backend-test.up.railway.app",
    "https://bssnaper.enfree.com",
    "https://sched.enfree.com",
    "https://enfree.com",
    "https://4to.app",
    "https://sched.4to.app",
    "https://first.4to.app",
]
