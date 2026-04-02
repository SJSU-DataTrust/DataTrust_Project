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
    "SECRET_GITHUB_TOKEN": r"\bgh[pousr]_[A-Za-z0-9]{20,}\b",
    "SECRET_PRIVATE_KEY_BLOCK": r"-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE KEY)-----",
    "SECRET_SLACK_TOKEN": r"\bxox[baprs]-[A-Za-z0-9-]+\b",
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
        "export employee data",
        "download all company files",
        "share internal documents externally",
        "send the source code",
        "give me all confidential documents",
        "extract the full customer list",
    ],
    "OUT_OF_SCOPE_ACCESS": [
        "show hr salaries",
        "give me payroll records",
        "show executive compensation",
        "give me all employee ssns",
        "show employee performance reviews",
        "show private hr files",
        "show confidential marketing plans",
        "show engineering architecture docs",
        "show restricted source code",
        "show all audit logs",
    ],
    "SENSITIVE_SUMMARY": [
        "summarize internal customer records",
        "summarize confidential data",
        "summarize private company documents",
        "summarize employee records",
        "summarize payroll information",
        "summarize internal architecture",
        "summarize private repos",
        "summarize restricted documents",
    ],
    "EXTERNAL_AI_RISK": [
        "paste into chatgpt",
        "send to chatgpt",
        "upload to claude",
        "send to gemini",
        "share with external ai",
        "copy this into openai",
        "upload internal docs to ai",
        "put our source code into ai",
        "share private data with ai",
    ],
    "ADMIN_SCOPE_REQUEST": [
        "show all users",
        "show all departments",
        "show all logs",
        "show all blocked prompts",
        "show all audit records",
        "download all policy logs",
    ],
}

RULE_WEIGHTS = {
    "PII_EMAIL": 15,
    "PII_PHONE": 15,
    "PII_SSN": 45,
    "PII_CREDIT_CARD": 50,
    "SECRET_AWS_KEY": 70,
    "SECRET_GENERIC_TOKEN": 35,
    "SECRET_GITHUB_TOKEN": 70,
    "SECRET_PRIVATE_KEY_BLOCK": 90,
    "SECRET_SLACK_TOKEN": 70,
    "DATA_EXFIL": 55,
    "OUT_OF_SCOPE_ACCESS": 65,
    "SENSITIVE_SUMMARY": 20,
    "EXTERNAL_AI_RISK": 45,
    "ADMIN_SCOPE_REQUEST": 40,
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


def decide_action(rule_codes: list[str], score: int, user_context: dict) -> str:
    print("DEBUG decide_action rule_codes:", rule_codes)
    print("DEBUG decide_action score:", score)
    print("DEBUG decide_action is_admin:", user_context.get("is_admin", False))

    if "OUT_OF_SCOPE_ACCESS" in rule_codes:
        print("DEBUG decide_action hit OUT_OF_SCOPE_ACCESS -> block")
        return "block"

    if "SECRET_AWS_KEY" in rule_codes:
        print("DEBUG decide_action hit SECRET_AWS_KEY -> block")
        return "block"
    if "SECRET_GITHUB_TOKEN" in rule_codes:
        print("DEBUG decide_action hit SECRET_GITHUB_TOKEN -> block")
        return "block"
    if "SECRET_PRIVATE_KEY_BLOCK" in rule_codes:
        print("DEBUG decide_action hit SECRET_PRIVATE_KEY_BLOCK -> block")
        return "block"
    if "SECRET_SLACK_TOKEN" in rule_codes:
        print("DEBUG decide_action hit SECRET_SLACK_TOKEN -> block")
        return "block"

    if "DATA_EXFIL" in rule_codes and score >= 50:
        print("DEBUG decide_action hit DATA_EXFIL -> block")
        return "block"

    if "EXTERNAL_AI_RISK" in rule_codes and not user_context.get("is_admin", False):
        print("DEBUG decide_action hit EXTERNAL_AI_RISK -> block")
        return "block"

    if "ADMIN_SCOPE_REQUEST" in rule_codes and not user_context.get("is_admin", False):
        print("DEBUG decide_action hit ADMIN_SCOPE_REQUEST -> block")
        return "block"

    if score >= 70:
        print("DEBUG decide_action score >= 70 -> block")
        return "block"
    if score >= 40:
        print("DEBUG decide_action score >= 40 -> review")
        return "review"
    if score >= 15:
        print("DEBUG decide_action score >= 15 -> redact")
        return "redact"

    print("DEBUG decide_action default -> allow")
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
    scope_hits = detect_department_scope_violations(text, user_context)
    level_hits = detect_auth_level_violations(text, user_context)

    matched_rules = list(dict.fromkeys(
        pii_hits + secret_hits + keyword_hits + scope_hits + level_hits
    ))

    risk_score = score_hits(matched_rules)
    risk_level = risk_level_from_score(risk_score)

    print("DEBUG user_context:", user_context)
    print("DEBUG matched_rules:", matched_rules)
    print("DEBUG risk_score:", risk_score)
    print("DEBUG about to call decide_action")

    decision = decide_action(matched_rules, risk_score, user_context)

    print("DEBUG decision returned:", decision)

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

def detect_department_scope_violations(text: str, user_context: dict) -> list[str]:
    lowered = text.lower()
    department = user_context.get("department")
    violations = []

    hr_terms = [
        "salary",
        "salary details",
        "payroll",
        "payroll records",
        "employee payroll",
        "employee ssn",
        "employee review",
        "employee reviews",
        "hr records",
        "compensation"
    ]

    tech_terms = [
        "source code",
        "engineering repo",
        "architecture docs",
        "deployment secrets",
        "root cause analysis",
        "private repo"
    ]

    marketing_terms = [
        "campaign strategy",
        "marketing budget",
        "brand roadmap",
        "campaign plan"
    ]

    supply_terms = [
        "vendor contracts",
        "inventory forecast",
        "supply chain plan",
        "procurement terms"
    ]

    if department != "HR" and any(term in lowered for term in hr_terms):
        violations.append("OUT_OF_SCOPE_ACCESS")

    if department != "TECH" and any(term in lowered for term in tech_terms):
        violations.append("OUT_OF_SCOPE_ACCESS")

    if department != "MARKETING" and any(term in lowered for term in marketing_terms):
        violations.append("OUT_OF_SCOPE_ACCESS")

    if department != "SUPPLY_CHAIN" and any(term in lowered for term in supply_terms):
        violations.append("OUT_OF_SCOPE_ACCESS")

    return violations

def detect_auth_level_violations(text: str, user_context: dict) -> List[str]:
    lowered = text.lower()
    auth_rank = user_context.get("auth_rank", 0)

    violations = []

    l3_only_terms = [
        "root cause analysis",
        "architecture decision record",
        "private incident report",
        "executive security review",
        "restricted design doc"
    ]

    l2_or_higher_terms = [
        "private repo",
        "internal deployment logs",
        "restricted confluence",
        "internal incident summary"
    ]

    if auth_rank < 3 and any(term in lowered for term in l3_only_terms):
        violations.append("OUT_OF_SCOPE_ACCESS")

    if auth_rank < 2 and any(term in lowered for term in l2_or_higher_terms):
        violations.append("OUT_OF_SCOPE_ACCESS")

    return violations