import uuid

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    lifetime_minutes: int

    class Config:
        from_attributes = True
