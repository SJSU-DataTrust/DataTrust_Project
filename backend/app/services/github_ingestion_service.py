from datetime import datetime, timezone
from app.db.supabase_client import supabase
from app.services.chunking_service import normalize_text, hash_text, chunk_text
from app.services.embedding_service import generate_embedding
from app.services.document_service import upsert_document, deactivate_chunks_for_document, insert_chunk
from app.services.sync_service import log_sync_event, upsert_connector_sync_state


def ingest_mock_github_document(user_context: dict | None = None) -> dict:
    # Mock document for end-to-end pipeline testing
    source_system = supabase.table("source_systems").select("id").eq("code", "GITHUB").single().execute().data
    department = supabase.table("departments").select("id").eq("code", "TECH").single().execute().data
    auth_level = supabase.table("auth_levels").select("id").eq("code", "L2").single().execute().data
    resource_scope = (
        supabase.table("resource_scopes")
        .select("id")
        .eq("external_resource_id", "datatrust-public-docs")
        .limit(1)
        .execute()
        .data
    )

    if not source_system or not department or not auth_level or not resource_scope:
        raise ValueError("Required source system, department, auth level, or resource scope not found")

    raw_text = """
    Backend deployment architecture:
    The DataTrust backend uses FastAPI with a policy enforcement layer.
    Requests are authenticated, checked for department and level authorization,
    and then routed to retrieval planning. Deployment notes include service boundaries,
    internal API gateway considerations, and connector orchestration plans.
    """

    normalized = normalize_text(raw_text)
    content_hash = hash_text(normalized)

    document = upsert_document({
        "source_system_id": source_system["id"],
        "resource_scope_id": resource_scope[0]["id"],
        "external_doc_id": "mock-github-backend-architecture",
        "external_parent_id": "datatrust-public-docs",
        "title": "Mock Backend Architecture Notes",
        "resource_path": "datatrust/public-docs/docs/backend-architecture.md",
        "source_url": "https://github.com/example/datatrust-public-docs/docs/backend-architecture.md",
        "department_id": department["id"],
        "min_auth_level_id": auth_level["id"],
        "content_hash": content_hash,
        "content_text": normalized,
        "last_modified_at": datetime.now(timezone.utc).isoformat(),
        "sync_status": "active",
        "is_active": True,
        "metadata": {
            "source_kind": "mock_github_file",
            "repo": "datatrust-public-docs",
            "path": "docs/backend-architecture.md"
        }
    })

    document_id = document["id"]

    # deactivate old chunks before inserting fresh ones
    deactivate_chunks_for_document(document_id)

    chunks = chunk_text(normalized, chunk_size_words=120, overlap_words=20)
    inserted_chunks = []

    for chunk in chunks:
        embedding = generate_embedding(chunk["chunk_text"])

        inserted = insert_chunk({
            "document_id": document_id,
            "chunk_index": chunk["chunk_index"],
            "chunk_text": chunk["chunk_text"],
            "chunk_hash": chunk["chunk_hash"],
            "token_count": chunk["token_count"],
            "source_system_id": source_system["id"],
            "resource_scope_id": resource_scope[0]["id"],
            "department_id": department["id"],
            "min_auth_level_id": auth_level["id"],
            "resource_path": "datatrust/public-docs/docs/backend-architecture.md",
            "is_active": True,
            "metadata": {
                "repo": "datatrust-public-docs",
                "path": "docs/backend-architecture.md"
            },
            "embedding": embedding
        })

        inserted_chunks.append(inserted)

    upsert_connector_sync_state({
        "source_system_id": source_system["id"],
        "external_doc_id": "mock-github-backend-architecture",
        "external_parent_id": "datatrust-public-docs",
        "department_id": department["id"],
        "min_auth_level_id": auth_level["id"],
        "last_seen_version": content_hash,
        "last_synced_version": content_hash,
        "last_modified_at": datetime.now(timezone.utc).isoformat(),
        "sync_status": "success",
        "last_sync_error": None,
    })

    log_sync_event("MOCK_GITHUB_INGESTION_SUCCESS", {
        "document_id": document_id,
        "external_doc_id": "mock-github-backend-architecture",
        "chunk_count": len(inserted_chunks),
    })

    return {
        "document_id": document_id,
        "external_doc_id": "mock-github-backend-architecture",
        "chunk_count": len(inserted_chunks),
        "content_hash": content_hash,
    }