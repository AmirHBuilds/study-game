from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db)):
    # Single-user personal app for now - just return the one seeded user.
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found")
    return user
