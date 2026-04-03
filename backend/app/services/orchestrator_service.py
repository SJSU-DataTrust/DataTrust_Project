import logging
from typing import List, Dict

from app.services.resource_scope_service import get_allowed_resource_scopes
from app.services.connectors import search_confluence, search_github, search_gdrive

logger = logging.getLogger(__name__)

def choose_sources(query: str, allowed_scopes: list[dict]) -> tuple[list[str], list[str]]:
    lowered = query.lower()
    selected = set()
    reasoning = []

    if any(word in lowered for word in ["repo", "code", "commit", "pull request", "architecture", "deployment", "backend"]):
        if any(s["source_type"] == "GITHUB" for s in allowed_scopes):
            selected.add("GITHUB")
            reasoning.append("GitHub selected because the query suggests code or architecture content.")

    if any(word in lowered for word in ["policy", "page", "confluence", "documentation", "docs", "runbook"]):
        if any(s["source_type"] == "CONFLUENCE" for s in allowed_scopes):
            selected.add("CONFLUENCE")
            reasoning.append("Confluence selected because the query suggests documentation or knowledge pages.")

    if any(word in lowered for word in ["drive", "folder", "document", "slides", "file", "campaign"]):
        if any(s["source_type"] == "GDRIVE" for s in allowed_scopes):
            selected.add("GDRIVE")
            reasoning.append("Google Drive selected because the query suggests document or folder-based content.")

    if not selected:
        selected = {s["source_type"] for s in allowed_scopes}
        reasoning.append("No strong source hint found, so all allowed source types were selected.")

    return list(selected), reasoning


def build_retrieval_plan(query: str, user_context: dict) -> dict:
    allowed_scopes = get_allowed_resource_scopes(user_context)
    selected_sources, reasoning = choose_sources(query, allowed_scopes)

    source_plans = []

    if "CONFLUENCE" in selected_sources:
        source_plans.append(search_confluence(query, allowed_scopes))

    if "GITHUB" in selected_sources:
        source_plans.append(search_github(query, allowed_scopes))

    if "GDRIVE" in selected_sources:
        source_plans.append(search_gdrive(query, allowed_scopes))

    blocked_sources = []
    all_source_types = {"CONFLUENCE", "GITHUB", "GDRIVE"}
    for source in all_source_types:
        if source not in selected_sources and any(s["source_type"] == source for s in allowed_scopes):
            blocked_sources.append({
                "source": source,
                "reason": "Allowed for user, but not selected by orchestration for this query."
            })

    return {
        "query": query,
        "status": "planned",
        "summary": {
            "message": "Retrieval plan created successfully.",
            "selected_source_count": len(selected_sources),
            "allowed_scope_count": len(allowed_scopes),
        },
        "user_context": {
            "user_id": user_context["user_id"],
            "department": user_context["department"],
            "auth_level": user_context["auth_level"],
            "auth_rank": user_context["auth_rank"],
        },
        "selected_sources": selected_sources,
        "selection_reasoning": reasoning,
        "allowed_scope_count": len(allowed_scopes),
        "allowed_scopes": allowed_scopes,
        "blocked_sources": blocked_sources,
        "source_plan_count": len(source_plans),
        "source_plans": source_plans,
    }