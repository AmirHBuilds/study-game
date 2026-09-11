import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class PlantedItem(Base):
    __tablename__ = "planted_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seed_type_id = Column(UUID(as_uuid=True), ForeignKey("seed_types.id"), nullable=False)

    plot_x = Column(Integer, nullable=False)
    plot_y = Column(Integer, nullable=False)

    planted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    watered_at = Column(DateTime, nullable=True)

    # Growth stage is DERIVED at read time from (now - planted_at) vs
    # seed_type.growth_duration_minutes. Never stored directly here -
    # see services/growth_service.py. This avoids needing a background
    # job just to keep a "current_stage" column in sync.
