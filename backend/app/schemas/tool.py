import uuid

from pydantic import BaseModel


class HoeUseRequest(BaseModel):
    user_id: uuid.UUID
    plot_x: int
    plot_y: int
