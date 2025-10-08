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

    # Admin flag
    is_admin = Column(Boolean, nullable=False, default=False)

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
            'is_admin': self.is_admin,
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

class PricingRule(Base):
    """촬영비 단가 규칙 테이블"""
    __tablename__ = "pricing_rules"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User identification
    user_id = Column(String(255), nullable=False, index=True)

    # 조건 필드 (NULL이면 전체 적용)
    location = Column(String(255), nullable=True, index=True)  # 지역
    venue = Column(String(255), nullable=True)                  # 장소(예식장)
    hall = Column(String(255), nullable=True)                   # 홀
    start_date = Column(String(10), nullable=True)             # 기간 시작 (YYYY.MM.DD)
    end_date = Column(String(10), nullable=True)               # 기간 끝 (YYYY.MM.DD)
    brand = Column(String(255), nullable=True, index=True)     # 브랜드
    album = Column(String(255), nullable=True, index=True)     # 앨범종류

    # 단가 정보
    price = Column(Integer, nullable=False, default=0)         # 단가
    description = Column(Text, nullable=True)                  # 설명/메모

    # 우선순위 (구체적인 규칙이 우선)
    priority = Column(Integer, nullable=False, default=0)      # 높을수록 우선 적용

    # 활성화 여부
    is_active = Column(Boolean, nullable=False, default=True)  # 활성 여부

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> Dict[str, Any]:
        """Convert PricingRule model to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'location': self.location,
            'venue': self.venue,
            'hall': self.hall,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'brand': self.brand,
            'album': self.album,
            'price': self.price,
            'description': self.description,
            'priority': self.priority,
            'is_active': self.is_active,
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

    # Photo sequence field (JSON data)
    photo_sequence = Column(JSON, nullable=True)

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
        """
        Dynamically convert SQLAlchemy model to dictionary.
        Automatically handles all columns and schema changes.
        """
        # Frontend expects camelCase for these fields
        field_mapping = {
            'photo_note': 'photoNote',
            'photo_sequence': 'photoSequence',
            'folder_name': 'folderName',
        }

        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)

            # Convert datetime to ISO format
            if value is not None and hasattr(value, 'isoformat'):
                value = value.isoformat()

            # Use frontend-compatible field names
            field_name = field_mapping.get(column.name, column.name)
            result[field_name] = value

        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any], user_id: str) -> 'Schedule':
        """
        Dynamically create Schedule instance from dictionary.
        Handles schema changes gracefully - only sets fields that exist.
        """
        # Reverse mapping: camelCase → snake_case
        field_mapping = {
            'photoNote': 'photo_note',
            'photoSequence': 'photo_sequence',
            'folderName': 'folder_name',
        }

        # Fields to exclude (auto-managed or provided separately)
        exclude_fields = {'id', 'user_id', 'created_at', 'updated_at'}

        # Build kwargs dynamically
        kwargs = {'user_id': user_id}

        for column in cls.__table__.columns:
            if column.name in exclude_fields:
                continue

            # Check both snake_case and camelCase
            value = None
            if column.name in data:
                value = data[column.name]
            else:
                # Try camelCase version
                for camel, snake in field_mapping.items():
                    if snake == column.name and camel in data:
                        value = data[camel]
                        break

            # Only set if value exists in data
            if value is not None:
                kwargs[column.name] = value

        return cls(**kwargs)


class TrashSchedule(Base):
    """Trash table for deleted schedules - separate from active schedules"""
    __tablename__ = "trash_schedules"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User identification
    user_id = Column(String(255), nullable=False, index=True)

    # Core schedule fields (same as Schedule)
    date = Column(String(20), nullable=False)
    location = Column(String(500), nullable=False, default="")
    time = Column(String(20), nullable=False, default="")
    couple = Column(String(500), nullable=False, default="")

    # Parsed fields
    contact = Column(String(500), nullable=False, default="")
    brand = Column(String(200), nullable=False, default="")
    album = Column(String(200), nullable=False, default="")
    photographer = Column(String(200), nullable=False, default="")
    memo = Column(Text, nullable=False, default="")
    manager = Column(String(200), nullable=False, default="")
    price = Column(Integer, nullable=False, default=0)

    # Review fields
    needs_review = Column(Boolean, nullable=False, default=False)
    review_reason = Column(String(500), nullable=False, default="")

    # Photo note field (JSON data)
    photo_note = Column(JSON, nullable=True)

    # Photo sequence field (JSON data)
    photo_sequence = Column(JSON, nullable=True)

    # New fields
    cuts = Column(Integer, nullable=False, default=0)
    folder_name = Column(String(500), nullable=False, default="")

    # Deletion metadata
    original_id = Column(Integer, nullable=False)  # ID from schedules table
    deleted_at = Column(DateTime(timezone=True), server_default=func.now())  # 삭제 일시

    # Original timestamps
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    # Indexes for performance
    __table_args__ = (
        Index('idx_trash_user_deleted', 'user_id', 'deleted_at'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert TrashSchedule to dictionary (same format as Schedule)"""
        return {
            'id': self.original_id,  # Use original ID for frontend compatibility
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
            'photoSequence': self.photo_sequence,
            'cuts': self.cuts,
            'folderName': self.folder_name,
            'deletedAt': self.deleted_at.isoformat() if self.deleted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_schedule(cls, schedule: Schedule) -> 'TrashSchedule':
        """Create TrashSchedule from a Schedule instance"""
        return cls(
            user_id=schedule.user_id,
            original_id=schedule.id,
            date=schedule.date,
            location=schedule.location,
            time=schedule.time,
            couple=schedule.couple,
            contact=schedule.contact,
            brand=schedule.brand,
            album=schedule.album,
            photographer=schedule.photographer,
            memo=schedule.memo,
            manager=schedule.manager,
            price=schedule.price,
            needs_review=schedule.needs_review,
            review_reason=schedule.review_reason,
            photo_note=schedule.photo_note,
            photo_sequence=schedule.photo_sequence,
            cuts=schedule.cuts,
            folder_name=schedule.folder_name,
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
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

        # Manual migrations for adding new columns
        db = SessionLocal()
        try:
            # Add 'hall' column to pricing_rules table if not exists
            db.execute(text("""
                SELECT hall FROM pricing_rules LIMIT 1
            """))
        except Exception:
            # Column doesn't exist, add it
            logger.info("Adding 'hall' column to pricing_rules table...")
            db.execute(text("""
                ALTER TABLE pricing_rules ADD COLUMN hall VARCHAR(255)
            """))
            db.commit()
            logger.info("✅ Added 'hall' column to pricing_rules table")
        finally:
            db.close()

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

    def ensure_user_exists(self, user_id: str):
        """Ensure user exists in User table, create if not exists"""
        try:
            existing_user = self.db.query(User).filter(User.id == user_id).first()
            if not existing_user:
                # Determine auth_provider from user_id prefix
                if user_id.startswith('anonymous_'):
                    auth_provider = 'anonymous'
                    is_anonymous = True
                elif user_id.startswith('google_'):
                    auth_provider = 'google'
                    is_anonymous = False
                elif user_id.startswith('naver_'):
                    auth_provider = 'naver'
                    is_anonymous = False
                elif user_id.startswith('kakao_'):
                    auth_provider = 'kakao'
                    is_anonymous = False
                else:
                    # Fallback for legacy or test data
                    auth_provider = 'unknown'
                    is_anonymous = False

                new_user = User(
                    id=user_id,
                    auth_provider=auth_provider,
                    is_anonymous=is_anonymous,
                    email=None,
                    name=None,
                    is_admin=False
                )
                self.db.add(new_user)
                self.db.commit()
                logger.info(f"✅ Created user: {user_id} (provider={auth_provider}, anonymous={is_anonymous})")
        except Exception as e:
            logger.error(f"❌ Failed to ensure user exists: {e}")
            self.db.rollback()

    def get_schedules(self, user_id: str) -> List[Schedule]:
        """Get all schedules for a user"""
        return self.db.query(Schedule).filter(
            Schedule.user_id == user_id
        ).order_by(Schedule.date, Schedule.time).all()

    def save_schedules(self, user_id: str, schedules_data: List[Dict[str, Any]]) -> List[Schedule]:
        """Replace all schedules for a user (bulk operation)"""
        try:
            # Ensure user exists (create if anonymous)
            self.ensure_user_exists(user_id)

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
                'needs_review', 'review_reason', 'photo_note', 'photo_sequence', 'cuts', 'folder_name'
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
        """Move a schedule to trash (soft delete)"""
        try:
            schedule = self.db.query(Schedule).filter(
                Schedule.id == schedule_id,
                Schedule.user_id == user_id
            ).first()

            if not schedule:
                return False

            # Move to trash
            trash_item = TrashSchedule.from_schedule(schedule)
            self.db.add(trash_item)
            self.db.delete(schedule)
            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to move schedule {schedule_id} to trash: {e}")
            raise

    def batch_delete_schedules(self, user_id: str, schedule_ids: List[int]) -> int:
        """Batch move schedules to trash (soft delete) - optimized version"""
        try:
            # Fetch all schedules in one query
            schedules = self.db.query(Schedule).filter(
                Schedule.id.in_(schedule_ids),
                Schedule.user_id == user_id
            ).all()

            if not schedules:
                return 0

            # Create trash items in bulk
            trash_items = [TrashSchedule.from_schedule(schedule) for schedule in schedules]
            self.db.bulk_save_objects(trash_items)

            # Delete original schedules in bulk
            deleted_count = self.db.query(Schedule).filter(
                Schedule.id.in_(schedule_ids),
                Schedule.user_id == user_id
            ).delete(synchronize_session=False)

            self.db.commit()
            logger.info(f"✅ Batch moved {deleted_count} schedules to trash")
            return deleted_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to batch delete schedules: {e}")
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
            # Ensure user exists (create if anonymous)
            self.ensure_user_exists(user_id)

            schedule = Schedule.from_dict(schedule_data, user_id)
            self.db.add(schedule)
            self.db.commit()
            self.db.refresh(schedule)
            return schedule
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to save schedule for user {user_id}: {e}")
            raise

    # ==================== Trash Methods ====================

    def get_trash_schedules(self, user_id: str) -> List[TrashSchedule]:
        """Get all deleted schedules from trash"""
        return self.db.query(TrashSchedule).filter(
            TrashSchedule.user_id == user_id
        ).order_by(TrashSchedule.deleted_at.desc()).all()

    def restore_schedule(self, user_id: str, original_id: int) -> Optional[Schedule]:
        """Restore a schedule from trash to active schedules"""
        try:
            # Find trash item by original_id
            trash_item = self.db.query(TrashSchedule).filter(
                TrashSchedule.user_id == user_id,
                TrashSchedule.original_id == original_id
            ).first()

            if not trash_item:
                return None

            # Create new schedule from trash data
            restored_schedule = Schedule(
                user_id=trash_item.user_id,
                date=trash_item.date,
                location=trash_item.location,
                time=trash_item.time,
                couple=trash_item.couple,
                contact=trash_item.contact,
                brand=trash_item.brand,
                album=trash_item.album,
                photographer=trash_item.photographer,
                memo=trash_item.memo,
                manager=trash_item.manager,
                price=trash_item.price,
                needs_review=trash_item.needs_review,
                review_reason=trash_item.review_reason,
                photo_note=trash_item.photo_note,
                photo_sequence=trash_item.photo_sequence,
                cuts=trash_item.cuts,
                folder_name=trash_item.folder_name,
            )

            # Add to schedules and remove from trash
            self.db.add(restored_schedule)
            self.db.delete(trash_item)
            self.db.commit()
            self.db.refresh(restored_schedule)

            return restored_schedule

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to restore schedule {original_id}: {e}")
            raise

    def batch_restore_schedules(self, user_id: str, original_ids: List[int]) -> int:
        """Batch restore schedules from trash - optimized version"""
        try:
            # Fetch all trash items in one query
            trash_items = self.db.query(TrashSchedule).filter(
                TrashSchedule.user_id == user_id,
                TrashSchedule.original_id.in_(original_ids)
            ).all()

            if not trash_items:
                return 0

            # Create restored schedules in bulk
            restored_schedules = []
            for trash_item in trash_items:
                restored_schedule = Schedule(
                    user_id=trash_item.user_id,
                    date=trash_item.date,
                    location=trash_item.location,
                    time=trash_item.time,
                    couple=trash_item.couple,
                    contact=trash_item.contact,
                    brand=trash_item.brand,
                    album=trash_item.album,
                    photographer=trash_item.photographer,
                    memo=trash_item.memo,
                    manager=trash_item.manager,
                    price=trash_item.price,
                    needs_review=trash_item.needs_review,
                    review_reason=trash_item.review_reason,
                    photo_note=trash_item.photo_note,
                    photo_sequence=trash_item.photo_sequence,
                    cuts=trash_item.cuts,
                    folder_name=trash_item.folder_name,
                )
                restored_schedules.append(restored_schedule)

            # Bulk add restored schedules
            self.db.bulk_save_objects(restored_schedules)

            # Bulk delete trash items
            restored_count = self.db.query(TrashSchedule).filter(
                TrashSchedule.user_id == user_id,
                TrashSchedule.original_id.in_(original_ids)
            ).delete(synchronize_session=False)

            self.db.commit()
            logger.info(f"✅ Batch restored {restored_count} schedules from trash")
            return restored_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to batch restore schedules: {e}")
            raise

    def restore_all_trash(self, user_id: str) -> int:
        """Restore all schedules from trash for a user"""
        try:
            # Fetch all trash items for user
            trash_items = self.db.query(TrashSchedule).filter(
                TrashSchedule.user_id == user_id
            ).all()

            if not trash_items:
                return 0

            # Create restored schedules in bulk
            restored_schedules = []
            for trash_item in trash_items:
                restored_schedule = Schedule(
                    user_id=trash_item.user_id,
                    date=trash_item.date,
                    location=trash_item.location,
                    time=trash_item.time,
                    couple=trash_item.couple,
                    contact=trash_item.contact,
                    brand=trash_item.brand,
                    album=trash_item.album,
                    photographer=trash_item.photographer,
                    memo=trash_item.memo,
                    manager=trash_item.manager,
                    price=trash_item.price,
                    needs_review=trash_item.needs_review,
                    review_reason=trash_item.review_reason,
                    photo_note=trash_item.photo_note,
                    photo_sequence=trash_item.photo_sequence,
                    cuts=trash_item.cuts,
                    folder_name=trash_item.folder_name,
                )
                restored_schedules.append(restored_schedule)

            # Bulk add restored schedules
            self.db.bulk_save_objects(restored_schedules)

            # Delete all trash items
            restored_count = self.db.query(TrashSchedule).filter(
                TrashSchedule.user_id == user_id
            ).delete(synchronize_session=False)

            self.db.commit()
            logger.info(f"✅ Restored all {restored_count} schedules from trash")
            return restored_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to restore all trash: {e}")
            raise

    def permanent_delete_schedule(self, user_id: str, original_id: int) -> bool:
        """Permanently delete a schedule from trash"""
        try:
            trash_item = self.db.query(TrashSchedule).filter(
                TrashSchedule.user_id == user_id,
                TrashSchedule.original_id == original_id
            ).first()

            if not trash_item:
                return False

            self.db.delete(trash_item)
            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to permanently delete schedule {original_id}: {e}")
            raise

    def empty_trash(self, user_id: str) -> int:
        """Permanently delete all schedules in trash for a user"""
        try:
            deleted_count = self.db.query(TrashSchedule).filter(
                TrashSchedule.user_id == user_id
            ).delete()
            self.db.commit()
            return deleted_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to empty trash for user {user_id}: {e}")
            raise