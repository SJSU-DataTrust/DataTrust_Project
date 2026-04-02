import { useState } from "react";
import { getRetrievalPlan } from "../services/api";

export default function ChatPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const userId = "c68c63d4-707c-4e82-896e-dd5fc2704371";

  const handleSend = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const data = await getRetrievalPlan(userId, text);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch retrieval plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111827", color: "white" }}>
      <div style={{ width: "260px", borderRight: "1px solid #374151", padding: "16px" }}>
        <h2>DataTrust</h2>
        <p>Chats</p>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #374151" }}>
          <strong>Department:</strong> TECH | <strong>Level:</strong> L2
        </div>

        <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
          {result && (
            <pre style={{ whiteSpace: "pre-wrap", background: "#1f2937", padding: "16px", borderRadius: "8px" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid #374151", display: "flex", gap: "12px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{ flex: 1, padding: "12px", borderRadius: "8px" }}
            placeholder="Ask about internal knowledge..."
          />
          <button onClick={handleSend} disabled={loading}>
            {loading ? "Loading..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}