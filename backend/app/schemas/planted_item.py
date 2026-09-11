import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_serializer


class PlantItemRequest(BaseModel):
    user_id: uuid.UUID
    seed_type_id: uuid.UUID
    plot_x: int
    plot_y: int


class PlantedItemResponse(BaseModel):
    id: uuid.UUID
    seed_type_id: uuid.UUID
    plot_x: int
    plot_y: int
    planted_at: datetime
    watered_at: Optional[datetime] = None
    stage: str

    class Config:
        from_attributes = True

    @field_serializer("planted_at")
    def _serialize_planted_at(self, value: datetime) -> str:
        return value.isoformat() + "Z"

    @field_serializer("watered_at")
    def _serialize_watered_at(self, value: Optional[datetime]) -> Optional[str]:
        return value.isoformat() + "Z" if value else None
