import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SeedType(Base):
    """A plantable/earnable item type: a flower, a tool, a decoration, etc."""

    __tablename__ = "seed_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, unique=True, nullable=False)  # e.g. "rose", "hoe"
    display_name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # "seed" | "tool" | "decoration"

    # Dedicated focus time needed to unlock this specific item type (permanent, one-time).
    unlock_cost_minutes = Column(Integer, nullable=False)

    # Focus cost per copy, once unlocked. For tools, this is the cost to earn one (durable) copy.
    earn_cost_minutes = Column(Integer, nullable=False)

    # Real-time growth duration after planting (minutes). Null for tools/decorations.
    growth_duration_minutes = Column(Integer, nullable=True)

    # For tools only: number of uses before it breaks and must be re-earned. Null = not applicable.
    max_durability = Column(Integer, nullable=True)


class UnlockProgress(Base):
    """Per-user, per-seed-type progress toward unlocking that specific item.

    Separate from User.lifetime_minutes: this tracks focus time spent
    specifically working toward THIS item, not overall lifetime study time.
    """

    __tablename__ = "unlock_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seed_type_id = Column(UUID(as_uuid=True), ForeignKey("seed_types.id"), nullable=False)
    minutes_focused = Column(Integer, nullable=False, default=0)
    unlocked = Column(Boolean, nullable=False, default=False)
