import base64
import requests
from app.core.config import settings

ALLOWED_EXTENSIONS = {
    ".md", ".txt", ".tsx", ".ts", ".jsx", ".js", ".css", ".py", ".java", ".json"
}

EXCLUDED_NAMES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".DS_Store",
}

EXCLUDED_DIRS = {
    "node_modules",
    "dist",
    "build",
    ".git",
    ".next",
    "coverage",
}


def should_index_github_path(path: str) -> bool:
    path_lower = path.lower()
    parts = set(path_lower.split("/"))

    if parts.intersection(EXCLUDED_DIRS):
        return False

    filename = path_lower.split("/")[-1]
    if filename in EXCLUDED_NAMES:
        return False

    # package.json is optional. I would exclude for demo quality.
    if filename == "package.json":
        return False

    return any(path_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS)


def github_headers():
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_repo_content(owner: str, repo: str, path: str = "", ref: str = "main"):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    res = requests.get(
        url,
        headers=github_headers(),
        params={"ref": ref},
        timeout=30,
    )
    res.raise_for_status()
    return res.json()


def walk_repo_files(owner: str, repo: str, start_path: str = "", ref: str = "main") -> list[dict]:
    results = []
    items = get_repo_content(owner, repo, start_path, ref)

    if isinstance(items, dict) and items.get("type") == "file":
        if should_index_github_path(items["path"]):
            results.append(items)
        return results

    for item in items:
        item_type = item.get("type")
        path = item.get("path", "")

        if item_type == "dir":
            if path.lower().split("/")[-1] in EXCLUDED_DIRS:
                continue
            results.extend(walk_repo_files(owner, repo, path, ref))
        elif item_type == "file":
            if should_index_github_path(path):
                results.append(item)

    return results


def fetch_github_file_text(owner: str, repo: str, path: str, ref: str = "main") -> dict:
    item = get_repo_content(owner, repo, path, ref)

    if item.get("type") != "file":
        raise ValueError(f"GitHub path is not a file: {path}")

    encoded = item.get("content", "")
    encoding = item.get("encoding")

    if encoding != "base64":
        raise ValueError(f"Unsupported GitHub encoding: {encoding}")

    text = base64.b64decode(encoded).decode("utf-8", errors="ignore")

    return {
        "external_doc_id": f"github:{owner}/{repo}:{path}",
        "title": path.split("/")[-1],
        "resource_path": f"github://{owner}/{repo}/{path}",
        "source_url": item.get("html_url"),
        "content_text": text,
        "sha": item.get("sha"),
        "path": path,
    }