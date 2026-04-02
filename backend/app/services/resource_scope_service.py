import logging
from typing import Any

from app.db.supabase_client import supabase

logger = logging.getLogger(__name__)


def get_allowed_resource_scopes(user_context: dict) -> list[dict]:
    department = user_context["department"]
    auth_rank = user_context["auth_rank"]

    result = (
        supabase.table("resource_scopes")
        .select(
            """
            id,
            resource_type,
            external_resource_id,
            parent_resource_id,
            resource_name,
            resource_path,
            is_active,
            metadata,
            source_systems:source_system_id(code,name),
            departments:department_id(code,name),
            auth_levels:min_auth_level_id(code,rank)
            """
        )
        .eq("is_active", True)
        .execute()
    )

    rows = result.data or []
    scopes: list[dict] = []

    logger.info(
        "RESOURCE_SCOPE_FETCH department=%s auth_rank=%s fetched_rows=%d",
        department,
        auth_rank,
        len(rows),
    )

    for row in rows:
        source_system: dict[str, Any] | None = row.get("source_systems")
        department_obj: dict[str, Any] | None = row.get("departments")
        auth_level: dict[str, Any] | None = row.get("auth_levels")

        if department_obj is None:
            logger.warning("Skipping scope row: missing departments join row=%s", row)
            continue

        if department_obj.get("code") != department:
            continue

        if source_system is None:
            logger.warning("Skipping scope row: missing source_systems join row=%s", row)
            continue

        min_rank = auth_level.get("rank") if auth_level else 999
        min_auth_level_code = auth_level.get("code") if auth_level else None

        if auth_rank < min_rank:
            logger.info(
                "Skipping scope row: insufficient auth user_auth_rank=%s min_rank=%s scope_id=%s",
                auth_rank,
                min_rank,
                row.get("id"),
            )
            continue

        scopes.append(
            {
                "scope_id": row.get("id"),
                "source_type": source_system.get("code"),
                "source_name": source_system.get("name"),
                "resource_type": row.get("resource_type"),
                "external_resource_id": row.get("external_resource_id"),
                "parent_resource_id": row.get("parent_resource_id"),
                "resource_name": row.get("resource_name"),
                "resource_path": row.get("resource_path"),
                "department": department_obj.get("code"),
                "department_name": department_obj.get("name"),
                "min_auth_level": min_auth_level_code,
                "min_auth_rank": min_rank,
                "metadata": row.get("metadata") or {},
            }
        )

    logger.info(
        "RESOURCE_SCOPE_RESOLVED department=%s auth_rank=%s allowed_scopes=%d",
        department,
        auth_rank,
        len(scopes),
    )

    return scopes