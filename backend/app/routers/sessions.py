import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.session import FocusSession
from app.schemas.session import CompleteSessionResult, SessionResponse, StartSessionRequest
from app.services import session_service

router = APIRouter()


def _get_session_or_404(db: Session, session_id: uuid.UUID) -> FocusSession:
    session = db.get(FocusSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/start", response_model=SessionResponse)
def start(payload: StartSessionRequest, db: Session = Depends(get_db)):
    return session_service.start_session(
        db,
        user_id=payload.user_id,
        goal_type=payload.goal_type,
        goal_seed_type_id=payload.goal_seed_type_id,
        planned_duration_minutes=payload.planned_duration_minutes,
    )


@router.post("/{session_id}/away", response_model=SessionResponse)
def away(session_id: uuid.UUID, db: Session = Depends(get_db)):
    session = _get_session_or_404(db, session_id)
    return session_service.mark_away(db, session)


@router.post("/{session_id}/back", response_model=SessionResponse)
def back(session_id: uuid.UUID, db: Session = Depends(get_db)):
    session = _get_session_or_404(db, session_id)
    return session_service.mark_back(db, session)


@router.post("/{session_id}/complete", response_model=CompleteSessionResult)
def complete(session_id: uuid.UUID, db: Session = Depends(get_db)):
    session = _get_session_or_404(db, session_id)
    session, success = session_service.complete_session(db, session)
    reward = "reward logic not wired up yet" if success else None
    return CompleteSessionResult(session=session, success=success, reward=reward)
