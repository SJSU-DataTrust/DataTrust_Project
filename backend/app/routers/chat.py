from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
import uuid

from app.core.security import get_current_user_id
from app.models.chat_models import ChatRequest
from app.services.authz_service import get_user_context
from app.services.request_understanding_service import understand_request
from app.services.policy_service import analyze_text
from app.services.vector_retrieval_service import retrieve_authorized_chunks
from app.services.generation_service import generate_answer_with_ollama
from app.services.output_guard_service import validate_generated_answer
from app.services.audit_service import log_policy_event


router = APIRouter()


@router.post("/chat")
def guarded_chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)):
    request_id = str(uuid.uuid4())

    try:
        user_context = get_user_context(user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"User context error: {str(e)}")

    understanding = understand_request(request.text)

    # reuse your existing deterministic policy engine
        policy_result = analyze_text(understanding["normalized_text"], user_context)

    categories = understanding["categories"]
    action = understanding["action"]
    normalized_text = understanding["normalized_text"]

    # Prompt injection
    if "PROMPT_INJECTION" in categories:
        policy_result["status"] = "blocked"
        policy_result["decision"] = "block"
        policy_result["code"] = "POLICY_DENIED"
        policy_result["reason_category"] = "PROMPT_INJECTION"
        policy_result["user_safe_explanation"] = "This request appears to attempt policy bypass or hidden instruction access."
        policy_result["suggested_safe_alternative"] = "Ask a scoped question about approved internal resources."
        policy_result["matched_rules"] = list(set(policy_result["matched_rules"] + ["PROMPT_INJECTION"]))
        policy_result["risk_level"] = "high"
        policy_result["risk_score"] = max(policy_result["risk_score"], 85)

    # Sensitive personal data
    if "PII_HIGH" in categories:
        policy_result["status"] = "blocked"
        policy_result["decision"] = "block"
        policy_result["code"] = "POLICY_DENIED"
        policy_result["reason_category"] = "SENSITIVE_PERSONAL_DATA"
        policy_result["user_safe_explanation"] = "This request involves restricted personal data."
        policy_result["suggested_safe_alternative"] = "Request a redacted or aggregated summary if your role allows it."
        policy_result["matched_rules"] = list(set(policy_result["matched_rules"] + ["PII_HIGH"]))
        policy_result["risk_level"] = "high"
        policy_result["risk_score"] = max(policy_result["risk_score"], 85)

    # Credentials and secrets
    if "CREDENTIALS" in categories:
        policy_result["status"] = "blocked"
        policy_result["decision"] = "block"
        policy_result["code"] = "POLICY_DENIED"
        policy_result["reason_category"] = "CREDENTIALS"
        policy_result["user_safe_explanation"] = "Credentials, secrets, and private keys cannot be disclosed."
        policy_result["suggested_safe_alternative"] = "Ask for a high-level explanation without sensitive values."
        policy_result["matched_rules"] = list(set(policy_result["matched_rules"] + ["CREDENTIALS"]))
        policy_result["risk_level"] = "high"
        policy_result["risk_score"] = max(policy_result["risk_score"], 90)

    # Source code + external AI / externalization
    if (
        "SOURCE_CODE" in categories
        and (
            "EXTERNAL_SHARING" in categories
            or action == "upload_to_external_ai"
            or " into ai" in normalized_text
            or " external_ai" in normalized_text
        )
    ):
        policy_result["status"] = "blocked"
        policy_result["decision"] = "block"
        policy_result["code"] = "POLICY_DENIED"
        policy_result["reason_category"] = "SOURCE_CODE_EXTERNALIZATION"
        policy_result["user_safe_explanation"] = "Uploading or sharing internal source code with external AI tools is restricted."
        policy_result["suggested_safe_alternative"] = "Ask for an internal architecture summary or a scoped explanation using approved internal sources."
        policy_result["matched_rules"] = list(set(policy_result["matched_rules"] + ["EXTERNAL_AI_RISK", "SOURCE_CODE_EXTERNALIZATION"]))
        policy_result["risk_level"] = "high"
        policy_result["risk_score"] = max(policy_result["risk_score"], 90)

    blocked_response = {
        "status": "blocked",
        "answer": None,
        "policy": {
            "status": policy_result["status"],
            "decision": policy_result["decision"],
            "code": policy_result.get("code"),
            "reason_category": policy_result.get("reason_category"),
            "user_safe_explanation": policy_result.get("user_safe_explanation"),
            "suggested_safe_alternative": policy_result.get("suggested_safe_alternative"),
            "matched_rules": policy_result["matched_rules"],
            "categories": understanding["categories"],
            "action": understanding["action"],
            "risk_level": policy_result["risk_level"],
            "risk_score": policy_result["risk_score"],
        },
        "selected_sources": [],
        "source_references": [],
        "retrieval_count": 0,
        "metadata": {
            "request_id": request_id,
            "normalized_text": understanding["normalized_text"],
            "prompt_injection_hits": understanding["prompt_injection_hits"],
        },
    }

    if policy_result["status"] == "blocked":
        log_policy_event(
            event_type="CHAT_BLOCKED_BY_POLICY",
            payload={
                "request_id": request_id,
                "user_id": user_context["user_id"],
                "query": request.text,
                "normalized_text": understanding["normalized_text"],
                "categories": understanding["categories"],
                "action": understanding["action"],
                "policy": policy_result,
            }
        )
        return JSONResponse(status_code=403, content=blocked_response)

    try:
        retrieval = retrieve_authorized_chunks(request.text, user_context, top_k=request.top_k)
        chunks = retrieval["chunks"]
    except Exception as e:
        log_policy_event(
            event_type="CHAT_RETRIEVAL_ERROR",
            payload={
                "request_id": request_id,
                "user_id": user_context["user_id"],
                "query": request.text,
                "error": str(e),
            }
        )
        raise HTTPException(status_code=500, detail=f"Retrieval error: {str(e)}")

    if not chunks:
        response = {
            "status": "clarify",
            "answer": "I could not find authorized internal content for that request. Try narrowing the request to a known department-approved resource or document type.",
            "policy": {
                "status": policy_result["status"],
                "decision": policy_result["decision"],
                "code": None,
                "reason_category": None,
                "user_safe_explanation": None,
                "suggested_safe_alternative": "Ask for a specific repo, page tree, runbook, or internal document within your approved scope.",
                "matched_rules": policy_result["matched_rules"],
                "categories": understanding["categories"],
                "action": understanding["action"],
                "risk_level": policy_result["risk_level"],
                "risk_score": policy_result["risk_score"],
            },
            "selected_sources": retrieval["selected_sources"],
            "source_references": [],
            "retrieval_count": 0,
            "metadata": {
                "request_id": request_id,
                "normalized_text": understanding["normalized_text"],
                "selection_reasoning": retrieval["selection_reasoning"],
            },
        }

        log_policy_event(
            event_type="CHAT_NO_AUTHORIZED_CONTEXT",
            payload=response
        )
        return response

    answer = generate_answer_with_ollama(user_context, request.text, chunks)
    output_check = validate_generated_answer(answer)

    final_status = "allowed" if output_check["status"] == "clean" else "allowed_with_redaction"

    response = {
        "status": final_status,
        "answer": output_check["answer"],
        "policy": {
            "status": policy_result["status"],
            "decision": policy_result["decision"],
            "code": None,
            "reason_category": None,
            "user_safe_explanation": None,
            "suggested_safe_alternative": None,
            "matched_rules": policy_result["matched_rules"],
            "categories": understanding["categories"],
            "action": understanding["action"],
            "risk_level": policy_result["risk_level"],
            "risk_score": policy_result["risk_score"],
        },
        "selected_sources": retrieval["selected_sources"],
        "source_references": [
            {
                "chunk_id": c["chunk_id"],
                "document_id": c["document_id"],
                "title": c["title"],
                "resource_path": c["resource_path"],
                "source_type": c["source_type"],
                "resource_name": c["resource_name"],
                "score": c["score"],
            }
            for c in chunks
        ],
        "retrieval_count": len(chunks),
        "metadata": {
            "request_id": request_id,
            "normalized_text": understanding["normalized_text"],
            "selection_reasoning": retrieval["selection_reasoning"],
            "output_validation": output_check["status"],
            "output_hits": output_check["hits"],
        },
    }

    log_policy_event(
        event_type="CHAT_GENERATED_RESPONSE",
        payload={
            "request_id": request_id,
            "user_id": user_context["user_id"],
            "query": request.text,
            "response": response,
        }
    )

    return response