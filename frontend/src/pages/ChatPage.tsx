import { useState } from "react";
import { sendChat } from "../services/api";

type ChatApiResponse = {
  status: string;
  answer: string | null;
  policy: {
    status: string;
    decision: string;
    code?: string | null;
    reason_category?: string | null;
    user_safe_explanation?: string | null;
    suggested_safe_alternative?: string | null;
    matched_rules: string[];
    categories: string[];
    action: string;
    risk_level: string;
    risk_score: number;
  };
  selected_sources: string[];
  source_references: Array<{
    chunk_id: number;
    document_id: number;
    title?: string | null;
    resource_path?: string | null;
    source_type?: string | null;
    resource_name?: string | null;
    score: number;
  }>;
  retrieval_count: number;
  metadata: Record<string, any>;
};

type ChatMessage =
  | { type: "user"; text: string }
  | { type: "blocked"; data: ChatApiResponse }
  | { type: "answer"; data: ChatApiResponse }
  | { type: "system"; text: string };

function Pill({
  children,
  color = "#1f2937",
  textColor = "#e5e7eb",
  borderColor = "#374151",
}: {
  children: React.ReactNode;
  color?: string;
  textColor?: string;
  borderColor?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background: color,
        color: textColor,
        fontSize: "12px",
        border: `1px solid ${borderColor}`,
        marginRight: "8px",
        marginBottom: "8px",
      }}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: "12px",
        padding: "14px",
        marginTop: "12px",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "10px", color: "#f9fafb" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function BlockedMessageCard({ data }: { data: ChatApiResponse }) {
  return (
    <div
      style={{
        maxWidth: "900px",
        background: "#2a0f12",
        border: "1px solid #7f1d1d",
        borderRadius: "16px",
        padding: "16px",
        color: "#fecaca",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>
        Blocked by policy
      </div>

      <div style={{ marginBottom: "12px" }}>
        <Pill color="#3f1d1d" textColor="#fecaca" borderColor="#7f1d1d">
          Decision: {data.policy.decision}
        </Pill>
        <Pill color="#3f1d1d" textColor="#fecaca" borderColor="#7f1d1d">
          Category: {data.policy.reason_category || "RESTRICTED_REQUEST"}
        </Pill>
        <Pill color="#3f1d1d" textColor="#fecaca" borderColor="#7f1d1d">
          Risk: {data.policy.risk_level} ({data.policy.risk_score})
        </Pill>
      </div>

      <div style={{ marginBottom: "10px", color: "#fee2e2" }}>
        {data.policy.user_safe_explanation || "This request is not allowed by policy."}
      </div>

      {data.policy.suggested_safe_alternative && (
        <div style={{ color: "#fecaca", fontSize: "14px" }}>
          <strong>Allowed alternative:</strong> {data.policy.suggested_safe_alternative}
        </div>
      )}

      {data.policy.matched_rules?.length > 0 && (
        <SectionCard title="Matched Policy Rules">
          <div>
            {data.policy.matched_rules.map((rule) => (
              <Pill key={rule} color="#3f1d1d" textColor="#fecaca" borderColor="#7f1d1d">
                {rule}
              </Pill>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function AnswerCard({ data }: { data: ChatApiResponse }) {
  return (
    <div
      style={{
        maxWidth: "900px",
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "16px",
        padding: "16px",
        color: "#e5e7eb",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <Pill>Decision: {data.policy.decision}</Pill>
        <Pill>Action: {data.policy.action}</Pill>
        <Pill>Risk: {data.policy.risk_level}</Pill>
        <Pill>Retrieved: {data.retrieval_count}</Pill>
      </div>

      <div
        style={{
          background: "#111827",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "14px",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
        }}
      >
        {data.answer || "No answer returned."}
      </div>

      {data.selected_sources?.length > 0 && (
        <SectionCard title="Selected Sources">
          <div>
            {data.selected_sources.map((source) => (
              <Pill key={source}>{source}</Pill>
            ))}
          </div>
        </SectionCard>
      )}

      {data.source_references?.length > 0 && (
        <SectionCard title="Source References">
          <div style={{ display: "grid", gap: "10px" }}>
            {data.source_references.map((ref) => (
              <div
                key={ref.chunk_id}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "12px",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {ref.resource_name || ref.title || `Chunk ${ref.chunk_id}`}
                </div>
                <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                  {ref.source_type} • {ref.resource_path || "No path"}
                </div>
                <div style={{ marginTop: "8px" }}>
                  <Pill>Chunk ID: {ref.chunk_id}</Pill>
                  <Pill>Score: {ref.score.toFixed(4)}</Pill>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Keep fixed user during development
  const userId = "c68c63d4-707c-4e82-896e-dd5fc2704371";

  const handleSend = async () => {
    if (!text.trim()) return;

    const userText = text;
    setText("");
    setLoading(true);
    setError("");

    setMessages((prev) => [...prev, { type: "user", text: userText }]);

    try {
      const result = await sendChat(userId, userText);

      if (result.blocked) {
        setMessages((prev) => [...prev, { type: "blocked", data: result.data }]);
      } else {
        setMessages((prev) => [...prev, { type: "answer", data: result.data }]);
      }
    } catch (err: any) {
      console.error(err);

      if (err.message === "AUTH_REQUIRED") {
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            text: "Your session has expired. Please sign in again.",
          },
        ]);
      } else {
        setError(err.message || "Request failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#020617", color: "white" }}>
      <div
        style={{
          width: "260px",
          borderRight: "1px solid #1e293b",
          padding: "20px",
          background: "#020c1f",
        }}
      >
        <h2 style={{ margin: 0, marginBottom: "20px" }}>DataTrust</h2>

        <button
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #334155",
            background: "#111827",
            color: "white",
            cursor: "pointer",
            marginBottom: "16px",
          }}
          onClick={() => {
            setMessages([]);
            setError("");
          }}
        >
          + New Chat
        </button>

        <div style={{ color: "#94a3b8", fontSize: "14px" }}>Chats</div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1e293b",
            background: "#04112b",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 600 }}>DataTrust Secure Assistant</div>
          <div>
            <Pill>Department: TECH</Pill>
            <Pill>Level: L2</Pill>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {messages.length === 0 && (
            <div style={{ color: "#94a3b8", maxWidth: "700px" }}>
              Ask a question about authorized internal content. DataTrust will evaluate policy,
              retrieve only approved sources, and generate a guarded answer.
            </div>
          )}

          {messages.map((message, idx) => (
            <div key={idx} style={{ marginBottom: "20px" }}>
              {message.type === "user" && (
                <div
                  style={{
                    marginLeft: "auto",
                    maxWidth: "720px",
                    background: "#2563eb",
                    color: "white",
                    padding: "14px 16px",
                    borderRadius: "16px",
                  }}
                >
                  {message.text}
                </div>
              )}

              {message.type === "blocked" && <BlockedMessageCard data={message.data} />}

              {message.type === "answer" && <AnswerCard data={message.data} />}

              {message.type === "system" && (
                <div
                  style={{
                    maxWidth: "720px",
                    background: "#1f2937",
                    color: "#e5e7eb",
                    padding: "14px 16px",
                    borderRadius: "16px",
                  }}
                >
                  {message.text}
                </div>
              )}
            </div>
          ))}

          {loading && <div style={{ color: "#94a3b8" }}>Processing request...</div>}

          {error && (
            <div
              style={{
                marginTop: "12px",
                background: "#3f1d1d",
                color: "#fecaca",
                padding: "12px",
                borderRadius: "10px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #1e293b",
            background: "#04112b",
            display: "flex",
            gap: "12px",
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #334155",
              background: "#f8fafc",
              color: "#111827",
              resize: "none",
            }}
            placeholder="Ask about internal documents, repositories, or knowledge..."
          />
          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              minWidth: "110px",
              borderRadius: "12px",
              border: "1px solid #334155",
              background: loading ? "#475569" : "#2563eb",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "Loading..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}