import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import get_current_user_id
from app.services.authz_service import get_user_context
from app.services.orchestrator_service import build_retrieval_plan
from app.services.audit_service import log_policy_event

logger = logging.getLogger(__name__)
router = APIRouter()


class RetrievalPlanRequest(BaseModel):
    text: str = Field(..., min_length=1)


@router.post("/retrieval-plan")
def retrieval_plan(
    request: RetrievalPlanRequest,
    user_id: str = Depends(get_current_user_id)
):
    logger.info("RETRIEVAL_ROUTE_START user_id=%s text=%r", user_id, request.text)

    try:
        user_context = get_user_context(user_id)
    except Exception as e:
        logger.exception("USER_CONTEXT_ERROR user_id=%s error=%s", user_id, str(e))
        raise HTTPException(status_code=404, detail=f"User context error: {str(e)}")

    logger.info("USER_CONTEXT_RESOLVED user_context=%s", user_context)

    plan = build_retrieval_plan(request.text, user_context)

    log_policy_event(
        event_type="RETRIEVAL_PLAN_CREATED",
        payload={
            "user_id": user_context["user_id"],
            "department": user_context["department"],
            "auth_level": user_context["auth_level"],
            "query": request.text,
            "selected_sources": plan["selected_sources"],
            "allowed_scope_count": plan["allowed_scope_count"],
            "source_plan_count": plan["source_plan_count"],
        }
    )

    logger.info(
        "RETRIEVAL_ROUTE_DONE user_id=%s allowed_scopes=%d",
        user_id,
        plan["allowed_scope_count"],
    )

    return plan