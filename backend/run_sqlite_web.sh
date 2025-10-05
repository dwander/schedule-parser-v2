#!/bin/bash

# SQLite Web 실행 스크립트
# Railway 환경과 로컬 환경을 자동으로 감지하여 실행

# 스크립트 디렉토리로 이동
cd "$(dirname "$0")"

DB_FILE="schedule_parser.db"

# Railway 환경 감지
if [ -n "$RAILWAY_STATIC_URL" ] || [ -n "$RAILWAY_GIT_BRANCH" ]; then
    echo "🚂 Railway 환경 감지됨"
    HOST="0.0.0.0"
    PORT="${SQLITE_WEB_PORT:-8080}"
    PASSWORD_FLAG="--password"
    echo "📡 실행 중: http://${RAILWAY_STATIC_URL}:${PORT}"
else
    echo "💻 로컬 개발 환경 감지됨"
    HOST="127.0.0.1"
    PORT="8081"
    PASSWORD_FLAG=""

    # venv 활성화 (로컬 환경)
    if [ -f "venv/bin/activate" ]; then
        echo "🐍 venv 환경 활성화..."
        source venv/bin/activate
    else
        echo "⚠️  경고: venv를 찾을 수 없습니다. 전역 패키지를 사용합니다."
    fi

    echo "📡 실행 중: http://localhost:${PORT}"
fi

# DB 파일 확인
if [ ! -f "$DB_FILE" ]; then
    echo "⚠️  경고: $DB_FILE 파일을 찾을 수 없습니다."
    echo "ℹ️  백엔드 서버를 먼저 실행하면 DB 파일이 생성됩니다."
fi

# sqlite-web 실행
echo "🗄️  SQLite Web 시작..."
sqlite_web "$DB_FILE" --host "$HOST" --port "$PORT" $PASSWORD_FLAG
