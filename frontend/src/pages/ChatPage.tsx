import { useState } from "react";
import { getRetrievalPlan } from "../services/api";

type RetrievalPlan = {
  query: string;
  status: string;
  summary: {
    message: string;
    selected_source_count: number;
    allowed_scope_count: number;
  };
  user_context: {
    user_id: string;
    department: string;
    auth_level: string;
    auth_rank: number;
  };
  selected_sources: string[];
  selection_reasoning: string[];
  allowed_scope_count: number;
  allowed_scopes: Array<{
    scope_id: number;
    source_type: string;
    source_name: string;
    resource_type: string;
    external_resource_id: string;
    parent_resource_id?: string | null;
    resource_name: string;
    resource_path: string;
    department: string;
    department_name: string;
    min_auth_level: string;
    min_auth_rank: number;
    metadata: Record<string, any>;
  }>;
  blocked_sources: Array<{
    source: string;
    reason: string;
  }>;
  source_plan_count: number;
  source_plans: Array<{
    source: string;
    reasoning: string;
    action: string;
    status: string;
    allowed_scope_count: number;
    matched_scopes: Array<{
      scope_id: number;
      resource_name: string;
      resource_type: string;
      resource_path: string;
      min_auth_level: string;
    }>;
  }>;
};

type ChatMessage =
  | { type: "user"; text: string }
  | { type: "system"; plan: RetrievalPlan };

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background: "#1f2937",
        color: "#e5e7eb",
        fontSize: "12px",
        border: "1px solid #374151",
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
        border: "1px solid #374151",
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

function SystemPlanCard({ plan }: { plan: RetrievalPlan }) {
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
      <div style={{ marginBottom: "12px", fontSize: "15px", color: "#cbd5e1" }}>
        {plan.summary.message}
      </div>

      <div style={{ marginBottom: "12px" }}>
        <Pill>Status: {plan.status}</Pill>
        <Pill>Department: {plan.user_context.department}</Pill>
        <Pill>Level: {plan.user_context.auth_level}</Pill>
        <Pill>Sources: {plan.summary.selected_source_count}</Pill>
        <Pill>Allowed Scopes: {plan.summary.allowed_scope_count}</Pill>
      </div>

      <SectionCard title="Selected Sources">
        <div>
          {plan.selected_sources.length > 0 ? (
            plan.selected_sources.map((source) => <Pill key={source}>{source}</Pill>)
          ) : (
            <div style={{ color: "#94a3b8" }}>No sources selected</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Selection Reasoning">
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#cbd5e1" }}>
          {plan.selection_reasoning.map((reason, idx) => (
            <li key={idx} style={{ marginBottom: "6px" }}>
              {reason}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Allowed Resource Scopes">
        <div style={{ display: "grid", gap: "10px" }}>
          {plan.allowed_scopes.map((scope) => (
            <div
              key={scope.scope_id}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                padding: "12px",
              }}
            >
              <div style={{ fontWeight: 600 }}>{scope.resource_name}</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                {scope.source_type} • {scope.resource_type} • {scope.resource_path}
              </div>
              <div style={{ marginTop: "8px" }}>
                <Pill>{scope.department}</Pill>
                <Pill>Min Level: {scope.min_auth_level}</Pill>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Connector Actions Planned">
        <div style={{ display: "grid", gap: "10px" }}>
          {plan.source_plans.map((sourcePlan, idx) => (
            <div
              key={idx}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                padding: "12px",
              }}
            >
              <div style={{ fontWeight: 600 }}>{sourcePlan.source}</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                {sourcePlan.reasoning}
              </div>
              <div style={{ marginTop: "8px" }}>
                <Pill>Action: {sourcePlan.action}</Pill>
                <Pill>Status: {sourcePlan.status}</Pill>
                <Pill>Scopes: {sourcePlan.allowed_scope_count}</Pill>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {plan.blocked_sources.length > 0 && (
        <SectionCard title="Non-selected Allowed Sources">
          <div style={{ display: "grid", gap: "10px" }}>
            {plan.blocked_sources.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#3f1d1d",
                  border: "1px solid #7f1d1d",
                  borderRadius: "10px",
                  padding: "12px",
                }}
              >
                <div style={{ fontWeight: 600 }}>{item.source}</div>
                <div style={{ fontSize: "13px", color: "#fecaca", marginTop: "4px" }}>
                  {item.reason}
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

  const userId = "c68c63d4-707c-4e82-896e-dd5fc2704371";

  const handleSend = async () => {
    if (!text.trim()) return;

    const userText = text;
    setText("");
    setLoading(true);
    setError("");

    setMessages((prev) => [...prev, { type: "user", text: userText }]);

    try {
      const data = await getRetrievalPlan(userId, userText);
      setMessages((prev) => [...prev, { type: "system", plan: data }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch retrieval plan");
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
          <div style={{ fontWeight: 600 }}>DataTrust Retrieval Planner</div>
          <div>
            <Pill>Department: TECH</Pill>
            <Pill>Level: L2</Pill>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {messages.length === 0 && (
            <div style={{ color: "#94a3b8", maxWidth: "700px" }}>
              Ask about internal knowledge and the system will generate a policy-aware retrieval plan
              based on your department and authorization level.
            </div>
          )}

          {messages.map((message, idx) => (
            <div key={idx} style={{ marginBottom: "20px" }}>
              {message.type === "user" ? (
                <div
                  style={{
                    marginLeft: "auto",
                    maxWidth: "720px",
                    background: "#1d4ed8",
                    color: "white",
                    padding: "14px 16px",
                    borderRadius: "16px",
                  }}
                >
                  {message.text}
                </div>
              ) : (
                <SystemPlanCard plan={message.plan} />
              )}
            </div>
          ))}

          {loading && <div style={{ color: "#94a3b8" }}>Planning retrieval...</div>}
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
            placeholder="Ask about internal documents, repositories, or pages..."
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