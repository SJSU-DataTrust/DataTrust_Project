const BACKEND_URL = "http://localhost:8000";

export async function getRetrievalPlan(userId: string, text: string) {
  const res = await fetch(`${BACKEND_URL}/retrieval-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to get retrieval plan: ${res.status} ${errText}`);
  }

  return res.json();
}

export async function analyzePrompt(userId: string, text: string) {
  const res = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();

  if (res.status === 401) {
    throw new Error("AUTH_REQUIRED");
  }

  if (res.status === 403) {
    return { blocked: true, data };
  }

  if (!res.ok) {
    throw new Error(data?.detail || "Analyze request failed");
  }

  return { blocked: false, data };
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