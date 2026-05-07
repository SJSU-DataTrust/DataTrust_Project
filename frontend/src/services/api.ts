const BACKEND_URL = "/api";

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const { data } = await parseResponseSafely(res);

  if (!res.ok) {
    throw new Error(data?.detail || "Login failed");
  }

  return data.user_id;
}

type ChatResult =
  | { blocked: true; data: any }
  | { blocked: false; data: any };

async function parseResponseSafely(res: Response) {
  const raw = await res.text();

  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { detail: raw || "Non-JSON response from backend" };
  }

  return { raw, data };
}

export async function streamChat(
  userId: string,
  text: string,
  handlers: {
    onStart?: () => void;
    onToken?: (token: string) => void;
    onDone?: (finalPayload?: any) => void;
    onBlocked?: (blockedPayload: any) => void;
    onError?: (message: string) => void;
  }
) {
  const res = await fetch(`${BACKEND_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ text, top_k: 3
     }),
  });

  if (res.status === 401) {
    handlers.onError?.("AUTH_REQUIRED");
    throw new Error("AUTH_REQUIRED");
  }

  if (res.status === 403) {
    const { data } = await parseResponseSafely(res);
    const blockedPayload = data?.detail ?? data;
    handlers.onBlocked?.(blockedPayload);
    return;
  }

  if (!res.ok) {
    const { data } = await parseResponseSafely(res);
    const msg =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail
        ? JSON.stringify(data.detail)
        : "Streaming chat request failed";
    handlers.onError?.(msg);
    throw new Error(msg);
  }

  if (!res.body) {
    const msg = "Streaming response body is empty";
    handlers.onError?.(msg);
    throw new Error(msg);
  }

  handlers.onStart?.();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: any = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let evt: any;
      try {
        evt = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (evt.type === "token") {
        handlers.onToken?.(evt.token || "");
      } else if (evt.type === "final") {
        finalPayload = evt.data;
      } else if (evt.type === "error") {
        const msg =
          typeof evt.message === "string"
            ? evt.message
            : JSON.stringify(evt.message || "Streaming error");
        handlers.onError?.(msg);
        throw new Error(msg);
      }
    }
  }

  handlers.onDone?.(finalPayload);
}

export async function sendChat(userId: string, text: string) {
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ text, top_k: 5 }),
  });

  const data = await res.json();

  if (res.status === 401) {
    throw new Error("AUTH_REQUIRED");
  }

  if (res.status === 403) {
    return { blocked: true, data };
  }

  if (!res.ok) {
    throw new Error(data?.detail || "Chat request failed");
  }

  return { blocked: false, data };
}

// ---------- ADMIN HELPERS ----------

async function adminGet(path: string, userId: string) {
  const res = await fetch(`/api${path}`, {
    headers: {
      "X-User-Id": userId,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.detail || `Failed to fetch ${path}`);
  }

  return data;
}

// ---------- ADMIN APIS ----------

export function getAdminSummary(userId: string) {
  return adminGet("/admin/summary", userId);
}

export function getDocumentsBySource(userId: string) {
  return adminGet("/admin/documents-by-source", userId);
}

export function getDocumentsByDepartment(userId: string) {
  return adminGet("/admin/documents-by-department", userId);
}

export function getChunksByLevel(userId: string) {
  return adminGet("/admin/chunks-by-level", userId);
}

export function getRecentDocuments(userId: string) {
  return adminGet("/admin/recent-documents", userId);
}

export function getDataQuality(userId: string) {
  return adminGet("/admin/data-quality", userId);
}

export function getConnectorHealth(userId: string) {
  return adminGet("/admin/connector-health", userId);
}

export function getIngestionProgress(userId: string) {
  return adminGet("/admin/ingestion-progress", userId);
}

export function getPolicyViolationsChart(userId: string) {
  return adminGet("/admin/policy-violations-chart", userId);
}

export function getUserActivityHeatmap(userId: string) {
  return adminGet("/admin/user-activity-heatmap", userId);
}

async function adminPost(path: string, userId: string) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
  });

  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Backend returned non-JSON response: ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    throw new Error(data?.detail || `Failed to call ${path}`);
  }

  return data;
}

export function runGithubSync(userId: string) {
  return adminPost("/ingest/github", userId);
}

export function runGoogleDriveSync(userId: string) {
  return adminPost("/ingest/google-drive", userId);
}

export async function runConfluenceSync(userId: string) {
  const res = await fetch(`/api/ingest/confluence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ space_key: "BC", max_pages: 100 }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.detail || "Confluence sync failed");
  }

  return data;
}