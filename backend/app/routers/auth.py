from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id
from app.services.authz_service import get_user_context

router = APIRouter()

@router.get("/me")
def me(user_id: str = Depends(get_current_user_id)):
    try:
        return get_user_context(user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))