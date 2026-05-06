# app/routers/google_drive_connector.py
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.connectors_sources.google_drive_connector import (
    list_files_in_folder,
    download_drive_file,
)
from app.services.ingestion_common_service import ingest_text_document

router = APIRouter()


class DriveIngestRequest(BaseModel):
    folder_id: str
    department_code: str
    level_code: str
    scope_external_id: str
    max_files: int = 20


@router.post("/ingest/google-drive")
def ingest_google_drive(request: DriveIngestRequest):
    files = list_files_in_folder(request.folder_id, request.max_files)
    results = []

    for file in files:
        file_id = file["id"]
        name = file["name"]
        mime_type = file["mimeType"]

        can_download = file.get("capabilities", {}).get("canDownload", True)
        if not can_download:
            continue

        raw_text = download_drive_file(file_id, mime_type)

        if not raw_text.strip():
            continue

        result = ingest_text_document(
            source_code="GDRIVE",
            department_code=request.department_code,
            level_code=request.level_code,
            scope_external_id=request.scope_external_id,
            external_doc_id=f"gdrive:{file_id}",
            external_parent_id=f"gdrive-folder:{request.folder_id}",
            title=name,
            resource_path=f"gdrive://folder/{request.folder_id}/{name}",
            source_url=file.get("webViewLink"),
            raw_text=raw_text,
            metadata={
                "connector": "google_drive",
                "folder_id": request.folder_id,
                "file_id": file_id,
                "mime_type": mime_type,
            },
        )
        results.append(result)

    return {
        "status": "success",
        "file_count": len(files),
        "ingested_count": len(results),
        "results": results,
    }