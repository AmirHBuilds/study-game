import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventory import InventoryItem
from app.models.planted_item import PlantedItem
from app.models.plot_state import PlotState
from app.models.seed import SeedType
from app.schemas.planted_item import PlantItemRequest, PlantedItemResponse
from app.services.growth_service import compute_stage

router = APIRouter()


def _to_response(db: Session, item: PlantedItem) -> PlantedItemResponse:
    seed_type = db.get(SeedType, item.seed_type_id)
    stage = compute_stage(
        item.planted_at, seed_type.growth_duration_minutes if seed_type else None
    )
    return PlantedItemResponse(
        id=item.id,
        seed_type_id=item.seed_type_id,
        plot_x=item.plot_x,
        plot_y=item.plot_y,
        planted_at=item.planted_at,
        watered_at=item.watered_at,
        stage=stage,
    )


@router.post("", response_model=PlantedItemResponse)
def plant_item(payload: PlantItemRequest, db: Session = Depends(get_db)):
    inv = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.user_id == payload.user_id,
            InventoryItem.seed_type_id == payload.seed_type_id,
            InventoryItem.quantity > 0,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=400, detail="No available seed of this type in inventory")

    plot = (
        db.query(PlotState)
        .filter(
            PlotState.user_id == payload.user_id,
            PlotState.plot_x == payload.plot_x,
            PlotState.plot_y == payload.plot_y,
        )
        .first()
    )
    if not plot or not plot.tilled:
        raise HTTPException(
            status_code=400,
            detail="This soil hasn't been prepared yet - till it with the hoe first",
        )

    existing = (
        db.query(PlantedItem)
        .filter(
            PlantedItem.user_id == payload.user_id,
            PlantedItem.plot_x == payload.plot_x,
            PlantedItem.plot_y == payload.plot_y,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="That plot is already occupied")

    inv.quantity -= 1
    if inv.quantity <= 0:
        db.delete(inv)

    planted = PlantedItem(
        user_id=payload.user_id,
        seed_type_id=payload.seed_type_id,
        plot_x=payload.plot_x,
        plot_y=payload.plot_y,
    )
    db.add(planted)
    db.commit()
    db.refresh(planted)

    return _to_response(db, planted)


@router.get("", response_model=List[PlantedItemResponse])
def list_planted_items(user_id: uuid.UUID, db: Session = Depends(get_db)):
    items = db.query(PlantedItem).filter(PlantedItem.user_id == user_id).all()
    return [_to_response(db, item) for item in items]


@router.post("/{item_id}/water", response_model=PlantedItemResponse)
def water_item(item_id: uuid.UUID, db: Session = Depends(get_db)):
    # Watering is free and always available - no cost check, no cooldown.
    item = db.get(PlantedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Planted item not found")
    item.watered_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return _to_response(db, item)


@router.post("/{item_id}/dig-up")
def dig_up_item(item_id: uuid.UUID, db: Session = Depends(get_db)):
    """Debug-access shovel: safely returns a planted flower to inventory.

    This endpoint is intentionally available during development. Later the
    shovel can be achievement-gated without changing the placement model.
    """
    item = db.get(PlantedItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Planted item not found")

    inventory_item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.user_id == item.user_id,
            InventoryItem.seed_type_id == item.seed_type_id,
            InventoryItem.banked_minutes.is_(None),
        )
        .first()
    )
    if inventory_item:
        inventory_item.quantity += 1
    else:
        db.add(
            InventoryItem(
                user_id=item.user_id,
                seed_type_id=item.seed_type_id,
                quantity=1,
            )
        )
    db.delete(item)
    db.commit()
    return {"success": True, "returned_seed_type_id": str(item.seed_type_id)}
