import logging
from app.db.supabase_client import supabase

logger = logging.getLogger(__name__)


def get_user_context(user_id: str) -> dict:
    result = (
        supabase.table("app_users")
        .select("""
            id,
            email,
            full_name,
            is_admin,
            is_active,
            departments:department_id(code,name),
            auth_levels:auth_level_id(code,rank)
        """)
        .eq("id", user_id)
        .single()
        .execute()
    )

    data = result.data

    if not data:
        logger.error("USER_NOT_FOUND user_id=%s", user_id)
        raise ValueError("User not found in app_users")

    department_obj = data.get("departments")
    auth_obj = data.get("auth_levels")

    context = {
        "user_id": data["id"],
        "email": data["email"],
        "full_name": data.get("full_name"),
        "is_admin": data.get("is_admin", False),
        "is_active": data.get("is_active", False),
        "department": department_obj.get("code") if department_obj else None,
        "department_name": department_obj.get("name") if department_obj else None,
        "auth_level": auth_obj.get("code") if auth_obj else None,
        "auth_rank": auth_obj.get("rank") if auth_obj else 0,
    }

    logger.info("USER_CONTEXT_RESOLVED user_context=%s", context)

    return context