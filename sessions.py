from fastapi import APIRouter, Depends, HTTPException
from models.schemas import SessionRecord
from services.session_service import SessionService
from utils.security import api_rate_limit, require_api_token

router = APIRouter(prefix='/sessions', tags=['sessions'])
session_service = SessionService()


@router.post('')
async def create_session_event(
    record: SessionRecord,
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> dict[str, str]:
    try:
        session_service.persist_session_event(record)
        return {'message': 'Session event stored'}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
