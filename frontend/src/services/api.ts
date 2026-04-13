const BACKEND_URL = "/api";

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

export async function sendChat(userId: string, text: string): Promise<ChatResult> {
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ text, top_k: 1 }),
  });

  const { data } = await parseResponseSafely(res);

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

export async function streamChat(
  userId: string,
  text: string,
  handlers: {
    onStart?: () => void;
    onToken?: (token: string) => void;
    onDone?: (finalPayload?: any) => void;
    onError?: (message: string) => void;
  }
) {
  const res = await fetch(`${BACKEND_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ text, top_k: 1 }),
  });

  if (!res.ok) {
    const { data } = await parseResponseSafely(res);
    const msg = data?.detail || "Streaming chat request failed";
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
        const msg = evt.message || "Streaming error";
        handlers.onError?.(msg);
        throw new Error(msg);
      }
    }
  }

  handlers.onDone?.(finalPayload);
}

async function adminGet(path: string, userId: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "X-User-Id": userId,
    },
  });

  const { data } = await parseResponseSafely(res);

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
// const BACKEND_URL = "/api";

// export async function sendChat(userId: string, text: string) {
//   const res = await fetch(`${BACKEND_URL}/chat`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "X-User-Id": userId,
//     },
//     body: JSON.stringify({ text, top_k: 1 }),
//   });

//   const data = await res.json();

//   if (res.status === 401) {
//     throw new Error("AUTH_REQUIRED");
//   }

//   if (res.status === 403) {
//     return { blocked: true, data };
//   }

//   if (!res.ok) {
//     throw new Error(data?.detail || "Chat request failed");
//   }

//   return { blocked: false, data };
// }

// async function adminGet(path: string, userId: string) {
//   const res = await fetch(`${BACKEND_URL}${path}`, {
//     headers: {
//       "X-User-Id": userId,
//     },
//   });

//   const data = await res.json();
//   if (!res.ok) {
//     throw new Error(data?.detail || `Failed to fetch ${path}`);
//   }
//   return data;
// }

// export function getAdminSummary(userId: string) {
//   return adminGet("/admin/summary", userId);
// }

// export function getAdminRecentBlocked(userId: string) {
//   return adminGet("/admin/recent-blocked", userId);
// }

// export function getAdminRecentEvents(userId: string) {
//   return adminGet("/admin/recent-events", userId);
// }

// export function getAdminRecentChat(userId: string) {
//   return adminGet("/admin/recent-chat", userId);
// }

// export function getAdminChartData(userId: string) {
//   return adminGet("/admin/chart-data", userId);
// }