import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_serializer


class StartSessionRequest(BaseModel):
    user_id: uuid.UUID
    goal_type: str  # "earn" | "unlock" | "bank"
    goal_seed_type_id: Optional[uuid.UUID] = None
    planned_duration_minutes: int


class SessionResponse(BaseModel):
    id: uuid.UUID
    status: str
    started_at: datetime
    planned_duration_minutes: int
    goal_type: str
    goal_seed_type_id: Optional[uuid.UUID] = None
    # Exposed so the client's countdown can exclude away time exactly the
    # same way the backend does - otherwise the two clocks disagree.
    away_accumulated_seconds: int

    class Config:
        from_attributes = True

    @field_serializer("started_at")
    def _serialize_started_at(self, value: datetime) -> str:
        return value.isoformat() + "Z"


class CompleteSessionResult(BaseModel):
    session: SessionResponse
    success: bool
    reward: Optional[str] = None
