# 개발 환경 설정

## PostgreSQL 로컬 개발 환경

프로덕션과 동일한 PostgreSQL 환경에서 개발하는 것을 권장합니다.

### 1. Docker Compose로 PostgreSQL 시작

```bash
# 프로젝트 루트에서
docker-compose up -d

# 또는 sudo가 필요한 경우
sudo docker-compose up -d
```

### 2. PostgreSQL 연결 확인

```bash
# 컨테이너 상태 확인
docker ps | grep postgres

# PostgreSQL 접속 테스트
docker exec -it schedule-parser-postgres psql -U postgres -d schedule_parser_dev
```

### 3. 백엔드 시작

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

백엔드가 시작되면 자동으로:
- 테이블 생성
- 마이그레이션 실행
- 기본 태그 추가

### 4. PostgreSQL 중지/재시작

```bash
# 중지
docker-compose stop

# 재시작
docker-compose start

# 완전 삭제 (데이터 포함)
docker-compose down -v
```

## SQLite로 돌아가기

필요하다면 SQLite로 돌아갈 수 있습니다:

```bash
# backend/.env 수정
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schedule_parser_dev
DATABASE_URL=sqlite:///./schedule_parser.db
```

## 환경 변수

`backend/.env` 파일:

```bash
# 로컬 개발: PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schedule_parser_dev

# SQLite 대체
# DATABASE_URL=sqlite:///./schedule_parser.db
```

## 데이터베이스 타입별 차이점

### PostgreSQL (프로덕션/권장)
- ✅ JSONB 타입으로 효율적인 JSON 처리
- ✅ 프로덕션 환경과 동일
- ✅ 타입 안정성 높음
- ⚠️ Docker 필요

### SQLite (간단한 개발)
- ✅ 설치 불필요
- ✅ 가벼움
- ⚠️ JSON을 TEXT로 저장
- ⚠️ 프로덕션과 차이 발생 가능

## 문제 해결

### Docker 권한 에러
```bash
# WSL/Linux에서
sudo usermod -aG docker $USER
newgrp docker

# 또는 sudo로 실행
sudo docker-compose up -d
```

### 포트 충돌 (5432)
```bash
# 다른 PostgreSQL이 실행 중인지 확인
sudo lsof -i :5432

# 중지
sudo systemctl stop postgresql
```

### 마이그레이션 강제 재실행
```bash
# PostgreSQL 접속
docker exec -it schedule-parser-postgres psql -U postgres -d schedule_parser_dev

# 컬럼 삭제 (재마이그레이션 테스트용)
ALTER TABLE schedules DROP COLUMN IF EXISTS tags;
\q

# 백엔드 재시작 → 자동 마이그레이션
```
