import { useMemo, useState } from "react";
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

type DemoUser = {
  key: string;
  label: string;
  userId: string;
  department: string;
  level: string;
};

const DEMO_USERS: DemoUser[] = [
  {
    key: "tech-l1",
    label: "Tech L1",
    userId: "a9285829-1226-494c-ab8e-82fd49af258f",
    department: "TECH",
    level: "L1",
  },
  {
    key: "tech-l2",
    label: "Tech L2",
    userId: "c68c63d4-707c-4e82-896e-dd5fc2704371",
    department: "TECH",
    level: "L2",
  },
  {
    key: "tech-l3",
    label: "Tech L3",
    userId: "a9f4626e-391e-48b9-9134-8f95863d4601",
    department: "TECH",
    level: "L3",
  },
  {
    key: "hr-l1",
    label: "HR L1",
    userId: "1edab7be-5f84-4334-aedb-6046eafb7263",
    department: "HR",
    level: "L1",
  },
  {
    key: "hr-l3",
    label: "HR L3",
    userId: "2e857853-a2a9-4334-be36-4861e6aba2cc",
    department: "HR",
    level: "L3",
  },
];

function Pill({
  children,
  background = "#1f2937",
  color = "#e5e7eb",
  border = "#374151",
}: {
  children: React.ReactNode;
  background?: string;
  color?: string;
  border?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: "999px",
        background,
        color,
        border: `1px solid ${border}`,
        fontSize: "12px",
        fontWeight: 600,
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
        marginTop: "14px",
        borderRadius: "18px",
        border: "1px solid #223046",
        background: "rgba(15, 23, 42, 0.88)",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 800,
          color: "#cbd5e1",
          marginBottom: "10px",
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function SidebarButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: "14px",
        border: "1px solid #253245",
        background: "linear-gradient(180deg, #111827 0%, #0b1220 100%)",
        color: "#f8fafc",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function BlockedMessageCard({ data }: { data: ChatApiResponse }) {
  return (
    <div
      style={{
        maxWidth: "920px",
        background: "linear-gradient(180deg, #2b1218 0%, #1f0d12 100%)",
        border: "1px solid #7f1d1d",
        borderRadius: "22px",
        padding: "18px",
        color: "#fee2e2",
        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 900, marginBottom: "12px" }}>
        Request blocked by policy
      </div>

      <div style={{ marginBottom: "12px" }}>
        <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
          Decision: {data.policy.decision}
        </Pill>
        <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
          Category: {data.policy.reason_category || "RESTRICTED_REQUEST"}
        </Pill>
        <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
          Risk: {data.policy.risk_level} ({data.policy.risk_score})
        </Pill>
      </div>

      <div style={{ color: "#ffe4e6", lineHeight: 1.65 }}>
        {data.policy.user_safe_explanation || "This request is restricted by policy."}
      </div>

      {data.policy.suggested_safe_alternative && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fecdd3",
          }}
        >
          <strong>Try instead:</strong> {data.policy.suggested_safe_alternative}
        </div>
      )}

      {data.policy.matched_rules?.length > 0 && (
        <SectionCard title="Matched policy rules">
          <div>
            {data.policy.matched_rules.map((rule) => (
              <Pill
                key={rule}
                background="#3f1d1d"
                color="#fecaca"
                border="#7f1d1d"
              >
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
        maxWidth: "920px",
        background: "linear-gradient(180deg, #0f172a 0%, #0b1325 100%)",
        border: "1px solid #243041",
        borderRadius: "22px",
        padding: "18px",
        color: "#e5e7eb",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ marginBottom: "10px" }}>
        <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
          Decision: {data.policy.decision}
        </Pill>
        <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
          Action: {data.policy.action}
        </Pill>
        <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
          Risk: {data.policy.risk_level}
        </Pill>
        <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
          Retrieved: {data.retrieval_count}
        </Pill>
      </div>

      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.7,
          fontSize: "15px",
          color: "#e2e8f0",
          padding: "14px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {data.answer || "No answer returned."}
      </div>

      {data.selected_sources?.length > 0 && (
        <SectionCard title="Selected sources">
          <div>
            {data.selected_sources.map((source) => (
              <Pill key={source}>{source}</Pill>
            ))}
          </div>
        </SectionCard>
      )}

      {data.source_references?.length > 0 && (
        <SectionCard title="Source references">
          <div style={{ display: "grid", gap: "10px" }}>
            {data.source_references.map((ref) => (
              <div
                key={ref.chunk_id}
                style={{
                  borderRadius: "14px",
                  border: "1px solid #243041",
                  background: "#101928",
                  padding: "12px",
                }}
              >
                <div style={{ fontWeight: 800, color: "#f8fafc" }}>
                  {ref.resource_name || ref.title || `Chunk ${ref.chunk_id}`}
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "13px",
                    color: "#94a3b8",
                    lineHeight: 1.5,
                  }}
                >
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
  const [selectedUserKey, setSelectedUserKey] = useState("tech-l2");

  const activeUser = useMemo(
    () => DEMO_USERS.find((u) => u.key === selectedUserKey) || DEMO_USERS[1],
    [selectedUserKey]
  );

  const handleSend = async () => {
    if (!text.trim()) return;

    const userText = text;
    setText("");
    setLoading(true);
    setError("");

    setMessages((prev) => [...prev, { type: "user", text: userText }]);

    try {
      const result = await sendChat(activeUser.userId, userText);

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
            text: "Your session expired. Please sign in again.",
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        background:
          "radial-gradient(circle at top left, #172554 0%, #020617 35%, #030712 100%)",
        color: "white",
      }}
    >
      <aside
        style={{
          width: "300px",
          borderRight: "1px solid #1e293b",
          padding: "22px",
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: "#f8fafc",
            }}
          >
            DataTrust
          </div>
          <div style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
            Private, policy-aware AI assistant
          </div>
        </div>

        <SidebarButton
          onClick={() => {
            setMessages([]);
            setError("");
          }}
        >
          + New Chat
        </SidebarButton>

        <div
          style={{
            marginTop: "18px",
            padding: "14px",
            borderRadius: "16px",
            border: "1px solid #223046",
            background: "#0b1220",
          }}
        >
          <div
            style={{
              marginBottom: "10px",
              fontSize: "13px",
              fontWeight: 800,
              color: "#cbd5e1",
            }}
          >
            Demo user
          </div>

          <select
            value={selectedUserKey}
            onChange={(e) => {
              setSelectedUserKey(e.target.value);
              setMessages([]);
              setError("");
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid #334155",
              background: "#111827",
              color: "#f8fafc",
              outline: "none",
              fontSize: "14px",
            }}
          >
            {DEMO_USERS.map((user) => (
              <option key={user.key} value={user.key}>
                {user.label}
              </option>
            ))}
          </select>

          <div style={{ marginTop: "12px" }}>
            <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
              {activeUser.department}
            </Pill>
            <Pill background="#1a2e1f" color="#bbf7d0" border="#166534">
              {activeUser.level}
            </Pill>
          </div>
        </div>

        <div style={{ marginTop: "20px", color: "#94a3b8", fontSize: "13px" }}>
          Suggested prompts:
          <div style={{ marginTop: "10px", display: "grid", gap: "8px", lineHeight: 1.5 }}>
            <div>• Summarize backend deployment architecture docs</div>
            <div>• Show restricted architecture decisions</div>
            <div>• Give me all ssns</div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #1e293b",
            background: "rgba(4, 17, 43, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: "18px" }}>
              Secure Internal Assistant
            </div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: "#94a3b8" }}>
              Department-aware and level-aware retrieval
            </div>
          </div>

          <div>
            <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
              Department: {activeUser.department}
            </Pill>
            <Pill background="#1a2e1f" color="#bbf7d0" border="#166534">
              Level: {activeUser.level}
            </Pill>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {messages.length === 0 && (
            <div
              style={{
                maxWidth: "760px",
                margin: "40px auto 0",
                textAlign: "center",
                color: "#cbd5e1",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 900,
                  color: "#f8fafc",
                  marginBottom: "10px",
                }}
              >
                Ask your internal assistant
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.7, color: "#94a3b8" }}>
                DataTrust evaluates policy, checks department and level access,
                retrieves only approved internal content, and generates a guarded answer.
              </div>
            </div>
          )}

          {messages.map((message, idx) => (
            <div key={idx} style={{ marginBottom: "20px" }}>
              {message.type === "user" && (
                <div
                  style={{
                    marginLeft: "auto",
                    maxWidth: "760px",
                    padding: "15px 18px",
                    borderRadius: "20px",
                    background:
                      "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)",
                    color: "white",
                    boxShadow: "0 8px 30px rgba(37,99,235,0.28)",
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
                    maxWidth: "760px",
                    background: "#111827",
                    color: "#e5e7eb",
                    padding: "14px 16px",
                    borderRadius: "16px",
                    border: "1px solid #243041",
                  }}
                >
                  {message.text}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ color: "#93c5fd", fontSize: "14px", marginTop: "10px" }}>
              Processing request...
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "12px",
                background: "#3f1d1d",
                color: "#fecaca",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #7f1d1d",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "18px 24px",
            borderTop: "1px solid #1e293b",
            background: "rgba(4, 17, 43, 0.75)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
              maxWidth: "1100px",
              margin: "0 auto",
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid #334155",
                background: "#f8fafc",
                color: "#111827",
                resize: "none",
                fontSize: "14px",
                lineHeight: 1.5,
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
              }}
              placeholder="Ask about internal docs, repos, runbooks, or architecture..."
            />
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                minWidth: "120px",
                height: "52px",
                borderRadius: "16px",
                border: "1px solid #1d4ed8",
                background: loading
                  ? "#475569"
                  : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontSize: "14px",
                boxShadow: loading ? "none" : "0 8px 24px rgba(37,99,235,0.25)",
              }}
            >
              {loading ? "Loading..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}