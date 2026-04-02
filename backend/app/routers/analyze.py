from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id
from app.models.policy_models import AnalyzeRequest, AnalyzeResponse
from app.services.authz_service import get_user_context
from app.services.policy_service import analyze_text
from app.services.audit_service import log_policy_event
import uuid

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_prompt(
    request: AnalyzeRequest,
    user_id: str = Depends(get_current_user_id)
):
    request_id = str(uuid.uuid4())
    print(f"TRACE request_id={request_id} route=/analyze start")

    try:
        user_context = get_user_context(user_id)
        print(f"TRACE request_id={request_id} user_context={user_context}")
    except Exception as e:
        print(f"TRACE request_id={request_id} user_context_error={str(e)}")
        raise HTTPException(status_code=404, detail=f"User context error: {str(e)}")

    policy_result = analyze_text(request.text, user_context)
    print(f"TRACE request_id={request_id} policy_result={policy_result}")

    log_policy_event(
        event_type="PROMPT_POLICY_ANALYSIS",
        payload={
            "request_id": request_id,
            "user": {
                "user_id": user_context["user_id"],
                "email": user_context["email"],
                "department": user_context["department"],
                "auth_level": user_context["auth_level"],
                "auth_rank": user_context["auth_rank"],
                "is_admin": user_context["is_admin"],
            },
            "input": {
                "original_text": request.text,
            },
            "result": {
                "decision": policy_result["decision"],
                "risk_level": policy_result["risk_level"],
                "risk_score": policy_result["risk_score"],
                "matched_rules": policy_result["matched_rules"],
                "pii_hits": policy_result["pii_hits"],
                "keyword_hits": policy_result["keyword_hits"],
                "redacted_text": policy_result["redacted_text"],
            },
        }
    )

    return {
        "user": {
            "user_id": user_context["user_id"],
            "department": user_context["department"],
            "auth_level": user_context["auth_level"],
        },
        "policy_result": {
            "decision": policy_result["decision"],
            "risk_level": policy_result["risk_level"],
            "risk_score": policy_result["risk_score"],
            "matched_rules": policy_result["matched_rules"],
            "pii_hits": policy_result["pii_hits"],
            "keyword_hits": policy_result["keyword_hits"],
            "redacted_text": policy_result["redacted_text"],
        }
    }