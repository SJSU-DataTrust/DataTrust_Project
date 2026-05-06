import io
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload


SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

EXPORT_MIME_MAP = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.presentation": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
}


def get_drive_service():
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS is not set")

    creds = service_account.Credentials.from_service_account_file(
        creds_path,
        scopes=SCOPES,
    )

    return build("drive", "v3", credentials=creds)


def list_files_in_folder(folder_id: str, max_files: int = 20) -> list[dict]:
    service = get_drive_service()

    query = f"'{folder_id}' in parents and trashed = false"

    res = service.files().list(
        q=query,
        pageSize=max_files,
        fields="files(id,name,mimeType,webViewLink,capabilities)",
    ).execute()

    return res.get("files", [])


def download_drive_file(file_id: str, mime_type: str) -> str:
    service = get_drive_service()

    if mime_type in EXPORT_MIME_MAP:
        request = service.files().export_media(
            fileId=file_id,
            mimeType=EXPORT_MIME_MAP[mime_type],
        )
    else:
        request = service.files().get_media(fileId=file_id)

    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)

    done = False
    while not done:
        _, done = downloader.next_chunk()

    return fh.getvalue().decode("utf-8", errors="ignore")