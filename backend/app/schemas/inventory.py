import uuid
from typing import Optional

from pydantic import BaseModel


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    seed_type_id: Optional[uuid.UUID] = None
    quantity: int
    banked_minutes: Optional[int] = None
    durability_remaining: Optional[int] = None

    class Config:
        from_attributes = True
