const BACKEND_URL = "/api";

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