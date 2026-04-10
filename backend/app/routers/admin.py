from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user_id
from app.services.authz_service import get_user_context
from app.db.supabase_client import supabase
from app.db.mongo_client import audit_logs, system_events

router = APIRouter()


def require_admin(user_id: str):
    user_context = get_user_context(user_id)
    if not user_context.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_context


@router.get("/admin/summary")
def admin_summary(user_id: str = Depends(get_current_user_id)):
    admin_user = require_admin(user_id)

    # Supabase counts
    documents_result = supabase.table("documents").select("id", count="exact").execute()
    active_chunks_result = (
        supabase.table("document_chunks")
        .select("id", count="exact")
        .eq("is_active", True)
        .execute()
    )
    scopes_result = supabase.table("resource_scopes").select("id", count="exact").execute()
    users_result = supabase.table("app_users").select("id", count="exact").execute()

    # Mongo counts
    blocked_count = audit_logs.count_documents({
        "$or": [
            {"payload.result.status": "blocked"},
            {"payload.response.status": "blocked"},
        ]
    })

    generated_count = audit_logs.count_documents({
        "event_type": "CHAT_GENERATED_RESPONSE"
    })

    no_context_count = audit_logs.count_documents({
        "event_type": "CHAT_NO_AUTHORIZED_CONTEXT"
    })

    ingestion_success_count = system_events.count_documents({
        "event_type": {
            "$in": [
                "MOCK_GITHUB_INGESTION_SUCCESS",
                "REAL_GITHUB_FILE_INGESTED",
                "LOCAL_FILE_INGESTED",
            ]
        }
    })

    return {
        "viewer": {
            "email": admin_user["email"],
            "department": admin_user["department"],
            "auth_level": admin_user["auth_level"],
            "is_admin": admin_user["is_admin"],
        },
        "metrics": {
            "total_users": users_result.count or 0,
            "total_scopes": scopes_result.count or 0,
            "total_documents": documents_result.count or 0,
            "active_chunks": active_chunks_result.count or 0,
            "blocked_requests": blocked_count,
            "generated_answers": generated_count,
            "no_authorized_context": no_context_count,
            "successful_ingestions": ingestion_success_count,
        }
    }


@router.get("/admin/recent-blocked")
def admin_recent_blocked(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = list(
        audit_logs.find(
            {
                "$or": [
                    {"payload.result.status": "blocked"},
                    {"payload.response.status": "blocked"},
                ]
            },
            {
                "event_type": 1,
                "payload.request_id": 1,
                "payload.user.email": 1,
                "payload.user.department": 1,
                "payload.user.auth_level": 1,
                "payload.input.original_text": 1,
                "payload.result.reason_category": 1,
                "payload.result.user_safe_explanation": 1,
                "payload.result.risk_level": 1,
                "payload.result.risk_score": 1,
                "created_at": 1,
            },
        )
        .sort("created_at", -1)
        .limit(10)
    )

    result = []
    for d in docs:
        payload = d.get("payload", {})
        user = payload.get("user", {})
        input_data = payload.get("input", {})
        policy_result = payload.get("result", {})

        result.append({
            "event_type": d.get("event_type"),
            "created_at": d.get("created_at"),
            "email": user.get("email"),
            "department": user.get("department"),
            "auth_level": user.get("auth_level"),
            "prompt": input_data.get("original_text"),
            "reason_category": policy_result.get("reason_category"),
            "risk_level": policy_result.get("risk_level"),
            "risk_score": policy_result.get("risk_score"),
            "user_safe_explanation": policy_result.get("user_safe_explanation"),
        })

    return result


@router.get("/admin/recent-events")
def admin_recent_events(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = list(
        system_events.find(
            {},
            {
                "event_type": 1,
                "payload": 1,
                "created_at": 1,
            },
        )
        .sort("created_at", -1)
        .limit(10)
    )

    result = []
    for d in docs:
        payload = d.get("payload", {})
        result.append({
            "event_type": d.get("event_type"),
            "created_at": d.get("created_at"),
            "summary": {
                "external_doc_id": payload.get("external_doc_id"),
                "chunk_count": payload.get("chunk_count"),
                "file_path": payload.get("file_path"),
                "source_code": payload.get("source_code"),
                "department_code": payload.get("department_code"),
                "level_code": payload.get("level_code"),
            },
        })

    return result


@router.get("/admin/recent-chat")
def admin_recent_chat(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = list(
        audit_logs.find(
            {
                "event_type": {
                    "$in": [
                        "CHAT_GENERATED_RESPONSE",
                        "CHAT_NO_AUTHORIZED_CONTEXT",
                        "CHAT_BLOCKED_BY_POLICY",
                    ]
                }
            },
            {
                "event_type": 1,
                "payload.request_id": 1,
                "payload.user_id": 1,
                "payload.query": 1,
                "payload.response.status": 1,
                "created_at": 1,
            },
        )
        .sort("created_at", -1)
        .limit(12)
    )

    result = []
    for d in docs:
        payload = d.get("payload", {})
        response = payload.get("response", {})
        result.append({
            "event_type": d.get("event_type"),
            "created_at": d.get("created_at"),
            "request_id": payload.get("request_id"),
            "user_id": payload.get("user_id"),
            "query": payload.get("query"),
            "status": response.get("status"),
        })

    return result