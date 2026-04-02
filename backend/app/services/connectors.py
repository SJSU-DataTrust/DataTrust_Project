def search_confluence(query: str, allowed_scopes: list[dict]) -> dict:
    return {
        "source": "CONFLUENCE",
        "query": query,
        "allowed_scope_count": len([s for s in allowed_scopes if s["source_type"] == "CONFLUENCE"]),
        "matched_scopes": [s for s in allowed_scopes if s["source_type"] == "CONFLUENCE"],
        "status": "planned"
    }


def search_github(query: str, allowed_scopes: list[dict]) -> dict:
    return {
        "source": "GITHUB",
        "query": query,
        "allowed_scope_count": len([s for s in allowed_scopes if s["source_type"] == "GITHUB"]),
        "matched_scopes": [s for s in allowed_scopes if s["source_type"] == "GITHUB"],
        "status": "planned"
    }


def search_gdrive(query: str, allowed_scopes: list[dict]) -> dict:
    return {
        "source": "GDRIVE",
        "query": query,
        "allowed_scope_count": len([s for s in allowed_scopes if s["source_type"] == "GDRIVE"]),
        "matched_scopes": [s for s in allowed_scopes if s["source_type"] == "GDRIVE"],
        "status": "planned"
    }