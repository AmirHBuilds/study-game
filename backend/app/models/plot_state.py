import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class PlotState(Base):
    """Whether a given garden tile has been tilled (prepared) and can be
    planted in. A small starter patch is tilled by default; expanding
    further requires the hoe.
    """

    __tablename__ = "plot_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plot_x = Column(Integer, nullable=False)
    plot_y = Column(Integer, nullable=False)
    tilled = Column(Boolean, nullable=False, default=False)
