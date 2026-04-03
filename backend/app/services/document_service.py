from datetime import datetime, timezone
from app.db.supabase_client import supabase


def upsert_document(document_payload: dict) -> dict:
    payload = {
        **document_payload,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        supabase.table("documents")
        .upsert(payload, on_conflict="source_system_id,external_doc_id")
        .execute()
    )

    if not result.data:
        raise ValueError("Failed to upsert document")

    return result.data[0]


def deactivate_chunks_for_document(document_id: int):
    supabase.table("document_chunks").update({
        "is_active": False,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("document_id", document_id).execute()


def insert_chunk(chunk_payload: dict):
    payload = {
        **chunk_payload,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = supabase.table("document_chunks").insert(payload).execute()
    return result.data[0] if result.data else None