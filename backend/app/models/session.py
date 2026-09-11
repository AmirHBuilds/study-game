import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # What she picked before starting. goal_seed_type_id is null only for "bank" goals
    # ("just focus for now" -> banked/saved time, no specific item chosen yet).
    goal_type = Column(String, nullable=False)  # "earn" | "unlock" | "bank"
    goal_seed_type_id = Column(UUID(as_uuid=True), ForeignKey("seed_types.id"), nullable=True)

    planned_duration_minutes = Column(Integer, nullable=False)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Trust-based "I'm studying elsewhere" pause. Time spent away doesn't count
    # toward or against the session - it's just excluded from elapsed-time math.
    away_at = Column(DateTime, nullable=True)
    away_accumulated_seconds = Column(Integer, nullable=False, default=0)

    completed_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="active")  # active | away | completed | abandoned
