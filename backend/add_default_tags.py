"""
기본 태그를 데이터베이스에 추가하는 마이그레이션 스크립트

기본 태그: 부케컷없음, 폐백촬영, 선촬영, 포토부스
"""

from database import get_database, Tag
from sqlalchemy.orm import Session

DEFAULT_TAGS = ['부케컷없음', '폐백촬영', '선촬영', '포토부스']

def add_default_tags_for_user(db: Session, user_id: str):
    """특정 사용자에 대해 기본 태그 추가"""
    added_count = 0

    for tag_value in DEFAULT_TAGS:
        # 이미 존재하는지 확인
        existing = db.query(Tag).filter(
            Tag.user_id == user_id,
            Tag.tag_type == 'tags',
            Tag.tag_value == tag_value
        ).first()

        if not existing:
            new_tag = Tag(
                user_id=user_id,
                tag_type='tags',
                tag_value=tag_value
            )
            db.add(new_tag)
            added_count += 1
            print(f"  ✓ Added tag: {tag_value}")
        else:
            print(f"  - Tag already exists: {tag_value}")

    return added_count

def main():
    """모든 사용자에 대해 기본 태그 추가"""
    db = next(get_database())

    try:
        # 모든 고유 사용자 ID 가져오기 (Schedule 테이블 기준)
        from database import Schedule
        user_ids = db.query(Schedule.user_id).distinct().all()
        user_ids = [uid[0] for uid in user_ids]

        if not user_ids:
            print("No users found in the database.")
            return

        print(f"Found {len(user_ids)} user(s)")
        print(f"Adding default tags: {', '.join(DEFAULT_TAGS)}\n")

        total_added = 0
        for user_id in user_ids:
            print(f"Processing user: {user_id}")
            added = add_default_tags_for_user(db, user_id)
            total_added += added
            print()

        db.commit()
        print(f"✅ Migration complete! Added {total_added} tag(s) in total.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
