import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)

    # Silent running total — drives achievement/milestone unlocks (e.g. 1hr -> 3x3 garden).
    # Never spent directly; separate from per-seed unlock progress.
    lifetime_minutes = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
