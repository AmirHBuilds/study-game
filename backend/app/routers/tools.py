from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventory import InventoryItem
from app.models.plot_state import PlotState
from app.models.seed import SeedType
from app.schemas.plot import PlotStateResponse
from app.schemas.tool import HoeUseRequest

router = APIRouter()


@router.post("/hoe/use", response_model=PlotStateResponse)
def use_hoe(payload: HoeUseRequest, db: Session = Depends(get_db)):
    hoe_type = db.query(SeedType).filter_by(key="hoe").first()
    if not hoe_type:
        raise HTTPException(status_code=500, detail="Hoe seed type not seeded")

    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.user_id == payload.user_id,
            InventoryItem.seed_type_id == hoe_type.id,
        )
        .first()
    )
    if not item or not item.durability_remaining or item.durability_remaining <= 0:
        raise HTTPException(
            status_code=400, detail="You don't have a working hoe - focus to earn one first"
        )

    plot = (
        db.query(PlotState)
        .filter(
            PlotState.user_id == payload.user_id,
            PlotState.plot_x == payload.plot_x,
            PlotState.plot_y == payload.plot_y,
        )
        .first()
    )
    if plot and plot.tilled:
        raise HTTPException(status_code=400, detail="That plot is already tilled")

    if not plot:
        plot = PlotState(
            user_id=payload.user_id, plot_x=payload.plot_x, plot_y=payload.plot_y, tilled=True
        )
        db.add(plot)
    else:
        plot.tilled = True

    item.durability_remaining -= 1
    if item.durability_remaining <= 0:
        db.delete(item)  # broken - she'll need to focus to earn a new one

    db.commit()
    db.refresh(plot)
    return plot
