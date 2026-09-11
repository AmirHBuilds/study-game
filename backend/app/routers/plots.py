import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.plot_state import PlotState
from app.schemas.plot import PlotStateResponse

router = APIRouter()


@router.get("", response_model=List[PlotStateResponse])
def list_plots(user_id: uuid.UUID, db: Session = Depends(get_db)):
    # Only tilled plots are returned - an absent plot is simply untilled.
    return (
        db.query(PlotState)
        .filter(PlotState.user_id == user_id, PlotState.tilled.is_(True))
        .all()
    )
