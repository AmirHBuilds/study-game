from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.seed import SeedType
from app.schemas.seed_type import SeedTypeResponse

router = APIRouter()


@router.get("", response_model=List[SeedTypeResponse])
def list_seed_types(db: Session = Depends(get_db)):
    return db.query(SeedType).all()
