import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.inventory import InventoryItem
from app.models.seed import SeedType, UnlockProgress
from app.models.session import FocusSession
from app.models.user import User

COMPLETION_GRACE_SECONDS = 30


def start_session(
    db: Session,
    user_id: uuid.UUID,
    goal_type: str,
    goal_seed_type_id: Optional[uuid.UUID],
    planned_duration_minutes: int,
) -> FocusSession:
    session = FocusSession(
        user_id=user_id,
        goal_type=goal_type,
        goal_seed_type_id=goal_seed_type_id,
        planned_duration_minutes=planned_duration_minutes,
        started_at=datetime.utcnow(),
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def mark_away(db: Session, session: FocusSession) -> FocusSession:
    session.status = "away"
    session.away_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def mark_back(db: Session, session: FocusSession) -> FocusSession:
    if session.away_at:
        elapsed_away = (datetime.utcnow() - session.away_at).total_seconds()
        session.away_accumulated_seconds += int(elapsed_away)
        session.away_at = None
    session.status = "active"
    db.commit()
    db.refresh(session)
    return session


def complete_session(db: Session, session: FocusSession) -> tuple[FocusSession, bool]:
    now = datetime.utcnow()
    total_elapsed_seconds = (
        (now - session.started_at).total_seconds() - session.away_accumulated_seconds
    )
    required_seconds = session.planned_duration_minutes * 60

    if total_elapsed_seconds + COMPLETION_GRACE_SECONDS < required_seconds:
        session.status = "abandoned"
        db.commit()
        db.refresh(session)
        return session, False

    session.status = "completed"
    session.completed_at = now
    db.commit()

    _apply_reward(db, session)

    db.refresh(session)
    return session, True


def _apply_reward(db: Session, session: FocusSession) -> None:
    user = db.get(User, session.user_id)
    if user:
        user.lifetime_minutes += session.planned_duration_minutes

    if session.goal_type == "earn" and session.goal_seed_type_id:
        _deliver_seed_copy(db, session)
    elif session.goal_type == "bank":
        _deliver_banked_time(db, session)
    elif session.goal_type == "unlock" and session.goal_seed_type_id:
        _apply_unlock_progress(db, session)

    db.commit()


def _existing_item(db: Session, session: FocusSession) -> Optional[InventoryItem]:
    return (
        db.query(InventoryItem)
        .filter(
            InventoryItem.user_id == session.user_id,
            InventoryItem.seed_type_id == session.goal_seed_type_id,
            InventoryItem.banked_minutes.is_(None),
        )
        .first()
    )


def _deliver_seed_copy(db: Session, session: FocusSession) -> None:
    seed_type = db.get(SeedType, session.goal_seed_type_id)
    item = _existing_item(db, session)

    if seed_type and seed_type.category == "tool":
        # Tools aren't stackable the way seeds are - earning one either
        # creates a fresh durable copy or tops an existing one back up.
        if item:
            item.durability_remaining = seed_type.max_durability
        else:
            db.add(
                InventoryItem(
                    user_id=session.user_id,
                    seed_type_id=session.goal_seed_type_id,
                    quantity=1,
                    durability_remaining=seed_type.max_durability,
                )
            )
        return

    if item:
        item.quantity += 1
    else:
        db.add(
            InventoryItem(
                user_id=session.user_id,
                seed_type_id=session.goal_seed_type_id,
                quantity=1,
            )
        )


def _deliver_banked_time(db: Session, session: FocusSession) -> None:
    db.add(
        InventoryItem(
            user_id=session.user_id,
            seed_type_id=None,
            quantity=1,
            banked_minutes=session.planned_duration_minutes,
        )
    )


def _apply_unlock_progress(db: Session, session: FocusSession) -> None:
    progress = (
        db.query(UnlockProgress)
        .filter(
            UnlockProgress.user_id == session.user_id,
            UnlockProgress.seed_type_id == session.goal_seed_type_id,
        )
        .first()
    )
    if not progress:
        progress = UnlockProgress(
            user_id=session.user_id,
            seed_type_id=session.goal_seed_type_id,
            minutes_focused=0,
            unlocked=False,
        )
        db.add(progress)

    progress.minutes_focused += session.planned_duration_minutes

    seed_type = db.get(SeedType, session.goal_seed_type_id)
    if seed_type and progress.minutes_focused >= seed_type.unlock_cost_minutes:
        progress.unlocked = True
