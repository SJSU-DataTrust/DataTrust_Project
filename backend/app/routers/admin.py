from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id
from app.services.authz_service import get_user_context
from app.db.supabase_client import supabase

router = APIRouter()


def require_admin(user_id: str):
    user = get_user_context(user_id)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/summary")
def admin_summary(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = supabase.table("documents").select("id,is_active").execute().data or []
    chunks = supabase.table("document_chunks").select("id,is_active").execute().data or []
    users = supabase.table("app_users").select("id,is_active,is_admin").execute().data or []

    return {
        "total_documents": len(docs),
        "active_documents": len([d for d in docs if d.get("is_active")]),
        "total_chunks": len(chunks),
        "active_chunks": len([c for c in chunks if c.get("is_active")]),
        "total_users": len(users),
        "active_users": len([u for u in users if u.get("is_active")]),
        "admin_users": len([u for u in users if u.get("is_admin")]),
    }


@router.get("/admin/documents-by-source")
def documents_by_source(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = (
        supabase.table("documents")
        .select("id, source_systems(code)")
        .execute()
        .data
        or []
    )

    counts = {}
    for d in docs:
        source = d.get("source_systems", {}).get("code", "UNKNOWN")
        counts[source] = counts.get(source, 0) + 1

    return [{"name": k, "value": v} for k, v in counts.items()]


@router.get("/admin/documents-by-department")
def documents_by_department(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = (
        supabase.table("documents")
        .select("id, departments(code)")
        .execute()
        .data
        or []
    )

    counts = {}
    for d in docs:
        dept = d.get("departments", {}).get("code", "UNKNOWN")
        counts[dept] = counts.get(dept, 0) + 1

    return [{"name": k, "value": v} for k, v in counts.items()]


@router.get("/admin/chunks-by-level")
def chunks_by_level(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    chunks = (
        supabase.table("document_chunks")
        .select("id, auth_levels(code)")
        .eq("is_active", True)
        .execute()
        .data
        or []
    )

    counts = {}
    for c in chunks:
        level = c.get("auth_levels", {}).get("code", "UNKNOWN")
        counts[level] = counts.get(level, 0) + 1

    return [{"name": k, "value": v} for k, v in counts.items()]


@router.get("/admin/recent-documents")
def recent_documents(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    return (
        supabase.table("documents")
        .select(
            "id,title,resource_path,sync_status,is_active,created_at,updated_at,"
            "source_systems(code),departments(code),auth_levels(code)"
        )
        .order("updated_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )


@router.get("/admin/recent-policy-events")
def recent_policy_events(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    try:
        return (
            supabase.table("policy_events")
            .select("*")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
            .data
            or []
        )
    except Exception:
        return []


@router.get("/admin/data-quality")
def admin_data_quality(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = supabase.table("documents").select("*").execute().data or []
    chunks = supabase.table("document_chunks").select("*").execute().data or []

    local_paths = [
        c for c in chunks
        if str(c.get("resource_path", "")).startswith(("/Users/", "/home/"))
    ]

    empty_chunks = [
        c for c in chunks
        if not str(c.get("chunk_text", "")).strip()
    ]

    inactive_chunks = [c for c in chunks if not c.get("is_active")]

    return {
        "document_count": len(docs),
        "chunk_count": len(chunks),
        "local_path_issues": len(local_paths),
        "empty_chunks": len(empty_chunks),
        "inactive_chunks": len(inactive_chunks),
        "status": "healthy" if not local_paths and not empty_chunks else "needs_attention",
    }

from datetime import datetime, timezone, timedelta
from collections import defaultdict
from app.db.supabase_client import supabase


@router.get("/admin/connector-health")
def connector_health(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    sources = supabase.table("source_systems").select("*").execute().data or []
    docs = supabase.table("documents").select("source_system_id,sync_status,updated_at").execute().data or []

    result = []

    for source in sources:
        source_docs = [d for d in docs if d.get("source_system_id") == source["id"]]
        latest = max([d.get("updated_at") for d in source_docs if d.get("updated_at")], default=None)

        failures = len([d for d in source_docs if d.get("sync_status") in ["failed", "error"]])
        active = len(source_docs)

        result.append({
            "source": source["code"],
            "name": source.get("name"),
            "status": "healthy" if failures == 0 else "attention",
            "document_count": active,
            "failure_count": failures,
            "last_sync_at": latest,
        })

    return result


@router.get("/admin/ingestion-progress")
def ingestion_progress(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    docs = (
        supabase.table("documents")
        .select("id,title,sync_status,updated_at,source_systems(code),departments(code),auth_levels(code)")
        .order("updated_at", desc=True)
        .limit(50)
        .execute()
        .data
        or []
    )

    total = len(docs)
    active = len([d for d in docs if d.get("sync_status") in ["active", "updated", "success"]])
    failed = len([d for d in docs if d.get("sync_status") in ["failed", "error"]])
    no_change = len([d for d in docs if d.get("sync_status") == "no_change"])

    return {
        "total_recent_documents": total,
        "active_or_updated": active,
        "failed": failed,
        "no_change": no_change,
        "recent": docs,
    }


@router.get("/admin/policy-violations-chart")
def policy_violations_chart(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    try:
        events = (
            supabase.table("policy_events")
            .select("*")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
            .data
            or []
        )
    except Exception:
        return []

    counts = defaultdict(int)

    for e in events:
        event_type = e.get("event_type", "UNKNOWN")
        created_at = e.get("created_at", "")
        day = created_at[:10] if created_at else "unknown"

        if "BLOCK" in event_type.upper() or "DENIED" in event_type.upper():
            counts[day] += 1

    return [{"date": k, "violations": v} for k, v in sorted(counts.items())]


@router.get("/admin/user-activity-heatmap")
def user_activity_heatmap(user_id: str = Depends(get_current_user_id)):
    require_admin(user_id)

    try:
        events = (
            supabase.table("policy_events")
            .select("*")
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
            .data
            or []
        )
    except Exception:
        return []

    heatmap = defaultdict(int)

    for e in events:
        created_at = e.get("created_at")
        if not created_at:
            continue

        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            key = f"{dt.strftime('%a')}-{dt.hour}"
            heatmap[key] += 1
        except Exception:
            continue

    result = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for day in days:
        for hour in range(24):
            result.append({
                "day": day,
                "hour": hour,
                "count": heatmap.get(f"{day}-{hour}", 0),
            })

    return result