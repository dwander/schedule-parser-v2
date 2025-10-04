import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, Index, text, JSON

# Load environment variables
load_dotenv()
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from typing import Optional, List, Dict, Any
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base 클래스
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    # Primary Key
    id = Column(String(255), primary_key=True, index=True)  # user_id (UUID or SNS ID)

    # Auth information
    auth_provider = Column(String(50), nullable=False, default="anonymous")  # 'google', 'naver', 'kakao', 'anonymous'
    is_anonymous = Column(Boolean, nullable=False, default=False)

    # User profile
    email = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)

    # Sample data flag
    has_seen_sample_data = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> Dict[str, Any]:
        """Convert User model to dictionary"""
        return {
            'id': self.id,
            'auth_provider': self.auth_provider,
            'is_anonymous': self.is_anonymous,
            'email': self.email,
            'name': self.name,
            'has_seen_sample_data': self.has_seen_sample_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }

class Tag(Base):
    __tablename__ = "tags"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User identification
    user_id = Column(String(255), nullable=False, index=True)

    # Tag fields
    tag_type = Column(String(20), nullable=False)  # 'brand' or 'album'
    tag_value = Column(String(100), nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Unique constraint
    __table_args__ = (
        Index('idx_user_tag_type', 'user_id', 'tag_type'),
        Index('idx_unique_user_tag', 'user_id', 'tag_type', 'tag_value', unique=True),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert Tag model to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'tag_type': self.tag_type,
            'tag_value': self.tag_value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class Schedule(Base):
    __tablename__ = "schedules"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User identification
    user_id = Column(String(255), nullable=False, index=True)

    # Core schedule fields
    date = Column(String(20), nullable=False)  # 2024.09.15 형식
    location = Column(String(500), nullable=False, default="")
    time = Column(String(20), nullable=False, default="")  # 14:00 형식
    couple = Column(String(500), nullable=False, default="")

    # Parsed fields
    contact = Column(String(500), nullable=False, default="")
    brand = Column(String(200), nullable=False, default="")
    album = Column(String(200), nullable=False, default="")
    photographer = Column(String(200), nullable=False, default="")
    memo = Column(Text, nullable=False, default="")
    manager = Column(String(200), nullable=False, default="")
    price = Column(Integer, nullable=False, default=0)  # 촬영단가

    # Review fields
    needs_review = Column(Boolean, nullable=False, default=False)
    review_reason = Column(String(500), nullable=False, default="")

    # Photo note field (JSON data)
    photo_note = Column(JSON, nullable=True)

    # New fields
    cuts = Column(Integer, nullable=False, default=0)  # 컷 수
    folder_name = Column(String(500), nullable=False, default="")  # 폴더명

    # Timestamp fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Indexes for performance
    __table_args__ = (
        Index('idx_user_date_time', 'user_id', 'date', 'time'),
        Index('idx_user_created_at', 'user_id', 'created_at'),
        Index('idx_date_time_couple', 'date', 'time', 'couple'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert SQLAlchemy model to dictionary (compatible with existing frontend)"""
        return {
            'id': self.id,
            'date': self.date,
            'location': self.location,
            'time': self.time,
            'couple': self.couple,
            'contact': self.contact,
            'brand': self.brand,
            'album': self.album,
            'photographer': self.photographer,
            'memo': self.memo,
            'manager': self.manager,
            'price': self.price,
            'needs_review': self.needs_review,
            'review_reason': self.review_reason,
            'photoNote': self.photo_note,
            'cuts': self.cuts,
            'folderName': self.folder_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], user_id: str) -> 'Schedule':
        """Create Schedule instance from dictionary (from frontend)"""
        return cls(
            user_id=user_id,
            date=data.get('date', ''),
            location=data.get('location', ''),
            time=data.get('time', ''),
            couple=data.get('couple', ''),
            contact=data.get('contact', ''),
            brand=data.get('brand', ''),
            album=data.get('album', ''),
            photographer=data.get('photographer', ''),
            memo=data.get('memo', ''),
            manager=data.get('manager', ''),
            price=data.get('price', 0),
            needs_review=data.get('needs_review', False),
            review_reason=data.get('review_reason', ''),
            photo_note=data.get('photoNote'),
            cuts=data.get('cuts', 0),
            folder_name=data.get('folderName', ''),
        )


# Database configuration
# Railway 볼륨 경로 사용 (/app/data로 마운트된 볼륨)
VOLUME_PATH = os.getenv('RAILWAY_VOLUME_MOUNT_PATH', '.')
DB_FILE_PATH = os.path.join(VOLUME_PATH, 'schedule_parser.db')
OLD_DB_PATH = './schedule_parser.db'  # 기존 DB 파일 경로

# 볼륨 디렉토리가 존재하지 않으면 생성
os.makedirs(VOLUME_PATH, exist_ok=True)

# DB 파일 마이그레이션 (기존 파일이 있고 새 위치에 없는 경우)
def migrate_database_file():
    """기존 DB 파일을 새로운 볼륨 경로로 마이그레이션"""
    import shutil

    # 볼륨 경로가 현재 디렉토리가 아니고, 기존 DB가 있고, 새 위치에 DB가 없는 경우
    if (VOLUME_PATH != '.' and
        os.path.exists(OLD_DB_PATH) and
        not os.path.exists(DB_FILE_PATH)):

        try:
            logger.info(f"🔄 DB 파일 마이그레이션 시작: {OLD_DB_PATH} → {DB_FILE_PATH}")
            shutil.copy2(OLD_DB_PATH, DB_FILE_PATH)
            logger.info(f"✅ DB 파일 마이그레이션 완료")

            # 마이그레이션 완료 후 기존 파일을 백업으로 이름 변경
            backup_path = OLD_DB_PATH + '.backup'
            shutil.move(OLD_DB_PATH, backup_path)
            logger.info(f"📦 기존 DB 파일을 백업으로 이동: {backup_path}")

        except Exception as e:
            logger.error(f"❌ DB 파일 마이그레이션 실패: {e}")
            # 마이그레이션 실패 시 기존 파일 사용
            logger.info("🔄 기존 DB 파일 위치 유지")

# DB 마이그레이션 실행
migrate_database_file()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DB_FILE_PATH}"
)

# 디버깅용 DATABASE_URL 로깅
db_type = "PostgreSQL" if DATABASE_URL.startswith("postgresql://") else "SQLite"
logger.info(f"🗄️  Using {db_type} database")
logger.info(f"🔗 DATABASE_URL: {DATABASE_URL[:50]}{'...' if len(DATABASE_URL) > 50 else ''}")

# SQLAlchemy engine and session
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_database():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        raise


def run_migrations():
    """Run database migrations automatically using SQLAlchemy ORM"""
    try:
        logger.info("🔄 Checking for database migrations...")

        # SQLAlchemy ORM을 사용해서 자동으로 DB별 타입 변환
        # 이미 모델이 정의되어 있으므로 create_all()로 마이그레이션 처리
        Base.metadata.create_all(bind=engine)

        logger.info("ℹ️  Database schema synchronized using SQLAlchemy ORM")

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        # 마이그레이션 실패해도 서버는 계속 실행되도록 예외를 다시 발생시키지 않음
        pass


def test_connection():
    """Test database connection"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


class ScheduleService:
    """Service class for schedule operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_schedules(self, user_id: str) -> List[Schedule]:
        """Get all schedules for a user"""
        return self.db.query(Schedule).filter(
            Schedule.user_id == user_id
        ).order_by(Schedule.date, Schedule.time).all()

    def save_schedules(self, user_id: str, schedules_data: List[Dict[str, Any]]) -> List[Schedule]:
        """Replace all schedules for a user (bulk operation)"""
        try:
            # 기존 데이터 모두 삭제
            self.db.query(Schedule).filter(Schedule.user_id == user_id).delete()

            # 새로운 데이터 추가
            new_schedules = []
            for schedule_data in schedules_data:
                schedule = Schedule.from_dict(schedule_data, user_id)
                self.db.add(schedule)
                new_schedules.append(schedule)

            self.db.commit()

            # 저장된 데이터 다시 조회해서 반환 (ID 포함)
            return self.get_schedules(user_id)

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to save schedules for user {user_id}: {e}")
            raise

    def update_schedule_field(self, user_id: str, schedule_id: int, field: str, value: Any) -> Optional[Schedule]:
        """Update a single field of a schedule"""
        try:
            schedule = self.db.query(Schedule).filter(
                Schedule.id == schedule_id,
                Schedule.user_id == user_id
            ).first()

            if not schedule:
                return None

            # 허용된 필드만 업데이트
            allowed_fields = [
                'date', 'location', 'time', 'couple', 'contact', 'brand',
                'album', 'photographer', 'memo', 'manager', 'price',
                'needs_review', 'review_reason', 'photo_note', 'cuts', 'folder_name'
            ]

            if field not in allowed_fields:
                raise ValueError(f"Field '{field}' is not allowed for update")

            setattr(schedule, field, value)
            self.db.commit()
            self.db.refresh(schedule)

            return schedule

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to update schedule {schedule_id} field {field}: {e}")
            raise

    def delete_schedule(self, user_id: str, schedule_id: int) -> bool:
        """Delete a specific schedule"""
        try:
            schedule = self.db.query(Schedule).filter(
                Schedule.id == schedule_id,
                Schedule.user_id == user_id
            ).first()

            if not schedule:
                return False

            self.db.delete(schedule)
            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to delete schedule {schedule_id}: {e}")
            raise

    def get_schedule_count(self, user_id: str) -> int:
        """Get total schedule count for a user"""
        return self.db.query(Schedule).filter(Schedule.user_id == user_id).count()

    def get_all_schedules(self, user_id: str) -> List[Schedule]:
        """Get all schedules for a user (alias for get_schedules)"""
        return self.get_schedules(user_id)

    def get_schedules_by_datetime(self, user_id: str, date: str, time: str) -> List[Schedule]:
        """Get schedules by specific date and time"""
        return self.db.query(Schedule).filter(
            Schedule.user_id == user_id,
            Schedule.date == date,
            Schedule.time == time
        ).all()

    def save_schedule(self, user_id: str, schedule_data: Dict[str, Any]) -> Schedule:
        """Save a single schedule"""
        try:
            schedule = Schedule.from_dict(schedule_data, user_id)
            self.db.add(schedule)
            self.db.commit()
            self.db.refresh(schedule)
            return schedule
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to save schedule for user {user_id}: {e}")
            raise