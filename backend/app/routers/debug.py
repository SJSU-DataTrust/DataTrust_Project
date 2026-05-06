from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id
from app.services.authz_service import get_user_context
from app.services.vector_retrieval_service import retrieve_authorized_chunks

router = APIRouter()

@router.post("/debug/retrieve")
def debug_retrieve(payload: dict, user_id: str = Depends(get_current_user_id)):
    user_context = get_user_context(user_id)
    query = payload.get("text", "")
    result = retrieve_authorized_chunks(query, user_context, top_k=payload.get("top_k", 5))
    return result

