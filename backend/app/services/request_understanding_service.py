import re
from typing import Dict, List


SYNONYM_MAP = {
    r"\bsocial security number(s)?\b": "ssn",
    r"\bs\.?s\.?n\.?s?\b": "ssn",
    r"\bemployee tax id(s)?\b": "tax_id",
    r"\bnational id(s)?\b": "national_id",
    r"\bidentity number(s)?\b": "identity_number",
    r"\bsource code\b": "source_code",
    r"\bcodebase\b": "source_code",
    r"\brepository\b": "repo",
    r"\brepositories\b": "repo",
    r"\bchatgpt\b": "external_ai",
    r"\bclaude\b": "external_ai",
    r"\bgemini\b": "external_ai",
    r"\bcopilot\b": "external_ai",
}

PROMPT_INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"reveal system prompt",
    r"bypass policy",
    r"act as admin",
    r"ignore all rules",
    r"dump the hidden prompt",
]

CATEGORY_RULES = {
    "PII_HIGH": ["ssn", "tax_id", "identity_number", "payroll", "salary", "employee review", "employee data"],
    "CREDENTIALS": ["password", "token", "secret", "api key", "private key", "credential"],
    "SOURCE_CODE": ["source_code", "repo", "git", "architecture decision record", "root cause analysis", "code"],
    "INTERNAL_DOCS": ["internal docs", "internal documents", "runbook", "confluence", "private docs", "document"],
    "EXTERNAL_SHARING": ["external_ai", "ai", "upload", "share externally", "send externally", "paste externally", "send to", "put into"],
    "ADMIN_ACTION": ["all logs", "all users", "all audit records", "download policy logs"],
}

ACTION_RULES = {
    "export": ["export", "download all", "dump", "send all", "give me all"],
    "upload_to_external_ai": ["upload", "paste", "send", "share"],
    "summarize": ["summarize", "summary", "explain"],
    "retrieve": ["show", "find", "get", "list"],
    "admin_action": ["delete", "disable", "override", "grant access"],
}


def normalize_prompt(text: str) -> str:
    value = text.lower()
    value = re.sub(r"[\r\n\t]+", " ", value)
    value = re.sub(r"[_\-/#:;,.!?()\[\]{}]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()

    for pattern, replacement in SYNONYM_MAP.items():
        value = re.sub(pattern, replacement, value)

    value = re.sub(r"\bssns\b", "ssn", value)
    value = re.sub(r"\brecords\b", "record", value)
    value = re.sub(r"\bdocuments\b", "document", value)

    return value


def detect_prompt_injection(normalized: str) -> List[str]:
    hits = []
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, normalized):
            hits.append("PROMPT_INJECTION")
            break
    return hits


def classify_categories(normalized: str) -> List[str]:
    categories = []
    for category, phrases in CATEGORY_RULES.items():
        if any(phrase in normalized for phrase in phrases):
            categories.append(category)

    if ("source_code" in normalized or "repo" in normalized or "code" in normalized) and ("ai" in normalized or "external_ai" in normalized):
        if "SOURCE_CODE" not in categories:
            categories.append("SOURCE_CODE")
        if "EXTERNAL_SHARING" not in categories:
            categories.append("EXTERNAL_SHARING")

    if "ssn" in normalized:
        if "PII_HIGH" not in categories:
            categories.append("PII_HIGH")

    return categories or ["BENIGN_INFORMATIONAL"]


def detect_action(normalized: str) -> str:
    if (
        ("upload" in normalized or "paste" in normalized or "send" in normalized or "share" in normalized or "put" in normalized)
        and ("external_ai" in normalized or " ai" in normalized)
    ):
        return "upload_to_external_ai"

    for action, phrases in ACTION_RULES.items():
        if any(phrase in normalized for phrase in phrases):
            return action

    return "answer"


def understand_request(text: str) -> Dict:
    normalized = normalize_prompt(text)
    categories = classify_categories(normalized)
    injection_hits = detect_prompt_injection(normalized)
    action = detect_action(normalized)

    if injection_hits and "PROMPT_INJECTION" not in categories:
        categories.append("PROMPT_INJECTION")

    return {
        "original_text": text,
        "normalized_text": normalized,
        "categories": categories,
        "action": action,
        "prompt_injection_hits": injection_hits,
    }