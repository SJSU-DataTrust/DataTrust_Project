const BACKEND_URL = "http://10.10.2.10:8000";

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

async function adminGet(path: string, userId: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
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

export function getAdminSummary(userId: string) {
  return adminGet("/admin/summary", userId);
}

export function getAdminRecentBlocked(userId: string) {
  return adminGet("/admin/recent-blocked", userId);
}

export function getAdminRecentEvents(userId: string) {
  return adminGet("/admin/recent-events", userId);
}

export function getAdminRecentChat(userId: string) {
  return adminGet("/admin/recent-chat", userId);
}

export function getAdminChartData(userId: string) {
  return adminGet("/admin/chart-data", userId);
}