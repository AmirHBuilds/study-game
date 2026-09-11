import uuid

from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class InventoryItem(Base):
    """Unplaced items she's earned and can place in the garden or spend from the Shop.

    seed_type_id is null for a banked-time token (a "saved focus minutes" entry,
    redeemable later against any unlocked item's earn cost).
    """

    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seed_type_id = Column(UUID(as_uuid=True), ForeignKey("seed_types.id"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)

    banked_minutes = Column(Integer, nullable=True)  # only set for banked-time tokens
    durability_remaining = Column(Integer, nullable=True)  # only set for tools
