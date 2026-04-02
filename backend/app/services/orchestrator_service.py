import logging
from typing import List, Dict

from app.services.resource_scope_service import get_allowed_resource_scopes
from app.services.connectors import search_confluence, search_github, search_gdrive

logger = logging.getLogger(__name__)


def choose_sources(query: str, allowed_scopes: List[Dict]) -> List[str]:
    lowered = query.lower()
    selected = set()

    logger.info("SOURCE_SELECTION_START query=%r", query)

    if any(word in lowered for word in ["repo", "code", "commit", "pull request", "architecture", "deployment"]):
        if any(s["source_type"] == "GITHUB" for s in allowed_scopes):
            selected.add("GITHUB")

    if any(word in lowered for word in ["policy", "page", "confluence", "documentation", "docs", "runbook"]):
        if any(s["source_type"] == "CONFLUENCE" for s in allowed_scopes):
            selected.add("CONFLUENCE")

    if any(word in lowered for word in ["drive", "folder", "document", "slides", "file", "campaign"]):
        if any(s["source_type"] == "GDRIVE" for s in allowed_scopes):
            selected.add("GDRIVE")

    # fallback
    if not selected:
        selected = {s["source_type"] for s in allowed_scopes}

    logger.info("SOURCE_SELECTION_DONE selected=%s", list(selected))
    return list(selected)


def build_retrieval_plan(query: str, user_context: dict) -> dict:
    logger.info(
        "RETRIEVAL_PLAN_START user_id=%s department=%s auth_rank=%s query=%r",
        user_context.get("user_id"),
        user_context.get("department"),
        user_context.get("auth_rank"),
        query,
    )

    allowed_scopes = get_allowed_resource_scopes(user_context)

    if not allowed_scopes:
        logger.warning("NO_SCOPES_BLOCKING_REQUEST")
        return {
            "query": query,
            "user_context": user_context,
            "selected_sources": [],
            "allowed_scope_count": 0,
            "allowed_scopes": [],
            "source_plan_count": 0,
            "source_plans": [],
            "status": "NO_ACCESS"
        }

    selected_sources = choose_sources(query, allowed_scopes)

    source_plans = []

    try:
        if "CONFLUENCE" in selected_sources:
            source_plans.append(search_confluence(query, allowed_scopes))

        if "GITHUB" in selected_sources:
            source_plans.append(search_github(query, allowed_scopes))

        if "GDRIVE" in selected_sources:
            source_plans.append(search_gdrive(query, allowed_scopes))

    except Exception as e:
        logger.exception("SOURCE_PLAN_ERROR error=%s", str(e))
        raise

    plan = {
        "query": query,
        "user_context": {
            "user_id": user_context.get("user_id"),
            "department": user_context.get("department"),
            "auth_level": user_context.get("auth_level"),
            "auth_rank": user_context.get("auth_rank"),
        },
        "selected_sources": selected_sources,
        "allowed_scope_count": len(allowed_scopes),
        "allowed_scopes": allowed_scopes,
        "source_plan_count": len(source_plans),
        "source_plans": source_plans,
    }

    logger.info(
        "RETRIEVAL_PLAN_DONE user_id=%s allowed_scopes=%d selected_sources=%s",
        user_context.get("user_id"),
        len(allowed_scopes),
        selected_sources,
    )

    return plan