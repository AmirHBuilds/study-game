import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventory import InventoryItem
from app.schemas.inventory import InventoryItemResponse

router = APIRouter()


@router.get("", response_model=List[InventoryItemResponse])
def list_inventory(user_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(InventoryItem).filter(InventoryItem.user_id == user_id).all()
