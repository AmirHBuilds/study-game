import uuid
from typing import Optional

from pydantic import BaseModel


class SeedTypeResponse(BaseModel):
    id: uuid.UUID
    key: str
    display_name: str
    category: str
    unlock_cost_minutes: int
    earn_cost_minutes: int
    growth_duration_minutes: Optional[int] = None
    max_durability: Optional[int] = None

    class Config:
        from_attributes = True
