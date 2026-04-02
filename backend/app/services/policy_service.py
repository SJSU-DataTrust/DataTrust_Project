import re
from typing import Dict, List


PII_PATTERNS = {
    "PII_EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    "PII_PHONE": r"\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
    "PII_SSN": r"\b\d{3}-\d{2}-\d{4}\b",
    "PII_CREDIT_CARD": r"\b(?:\d[ -]*?){13,16}\b",
}

SECRET_PATTERNS = {
    "SECRET_AWS_KEY": r"\bAKIA[0-9A-Z]{16}\b",
    "SECRET_GENERIC_TOKEN": r"\b(?:api[_-]?key|secret|token|password)\b",
}

KEYWORD_RULES = {
    "DATA_EXFIL": [
        "send all customer data",
        "export all customer data",
        "share confidential file",
        "download the database",
        "send internal records",
        "send employee records",
        "email the customer list",
    ],
    "OUT_OF_SCOPE_ACCESS": [
        "show hr salaries",
        "give me payroll records",
        "show executive compensation",
        "give me all employee ssns",
    ],
    "SENSITIVE_SUMMARY": [
        "summarize internal customer records",
        "summarize confidential data",
        "summarize private company documents",
    ],
    "EXTERNAL_AI_RISK": [
        "paste into chatgpt",
        "send to chatgpt",
        "upload to claude",
        "send to gemini",
        "share with external ai",
    ],
}

RULE_WEIGHTS = {
    "PII_EMAIL": 15,
    "PII_PHONE": 15,
    "PII_SSN": 40,
    "PII_CREDIT_CARD": 45,
    "SECRET_AWS_KEY": 60,
    "SECRET_GENERIC_TOKEN": 35,
    "DATA_EXFIL": 50,
    "OUT_OF_SCOPE_ACCESS": 60,
    "SENSITIVE_SUMMARY": 20,
    "EXTERNAL_AI_RISK": 35,
}


def find_pattern_hits(text: str, patterns: Dict[str, str]) -> List[str]:
    hits = []
    for rule_code, pattern in patterns.items():
        if re.search(pattern, text, flags=re.IGNORECASE):
            hits.append(rule_code)
    return hits


def find_keyword_hits(text: str, keyword_rules: Dict[str, List[str]]) -> List[str]:
    lowered = text.lower()
    hits = []
    for rule_code, phrases in keyword_rules.items():
        if any(phrase in lowered for phrase in phrases):
            hits.append(rule_code)
    return hits


def redact_text(text: str) -> str:
    redacted = text

    # Redact PII patterns
    redacted = re.sub(PII_PATTERNS["PII_EMAIL"], "[REDACTED_EMAIL]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(PII_PATTERNS["PII_PHONE"], "[REDACTED_PHONE]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(PII_PATTERNS["PII_SSN"], "[REDACTED_SSN]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(PII_PATTERNS["PII_CREDIT_CARD"], "[REDACTED_CARD]", redacted, flags=re.IGNORECASE)

    # Redact obvious secret words
    redacted = re.sub(r"\b(api[_-]?key|secret|token|password)\b", "[REDACTED_SECRET_LABEL]", redacted, flags=re.IGNORECASE)

    return redacted


def score_hits(rule_codes: List[str]) -> int:
    score = 0
    for code in rule_codes:
        score += RULE_WEIGHTS.get(code, 0)
    return min(score, 100)


def decide_action(rule_codes: List[str], score: int) -> str:
    if "SECRET_AWS_KEY" in rule_codes:
        return "block"
    if "OUT_OF_SCOPE_ACCESS" in rule_codes:
        return "block"
    if "DATA_EXFIL" in rule_codes and score >= 50:
        return "block"
    if score >= 70:
        return "block"
    if score >= 40:
        return "review"
    if score >= 15:
        return "redact"
    return "allow"


def risk_level_from_score(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    if score >= 15:
        return "low"
    return "minimal"


def analyze_text(text: str, user_context: dict) -> dict:
    pii_hits = find_pattern_hits(text, PII_PATTERNS)
    secret_hits = find_pattern_hits(text, SECRET_PATTERNS)
    keyword_hits = find_keyword_hits(text, KEYWORD_RULES)

    matched_rules = list(dict.fromkeys(pii_hits + secret_hits + keyword_hits))
    risk_score = score_hits(matched_rules)
    risk_level = risk_level_from_score(risk_score)
    decision = decide_action(matched_rules, risk_score)
    redacted_text = redact_text(text)

    return {
        "decision": decision,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "matched_rules": matched_rules,
        "pii_hits": pii_hits,
        "keyword_hits": keyword_hits,
        "redacted_text": redacted_text,
        "user_context_snapshot": {
            "user_id": user_context["user_id"],
            "department": user_context["department"],
            "auth_level": user_context["auth_level"],
            "auth_rank": user_context["auth_rank"],
            "is_admin": user_context["is_admin"],
        }
    }