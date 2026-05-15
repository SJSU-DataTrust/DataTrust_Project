import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  streamChatWithToken,
  getChatHistory,
  saveChatSession,
  updateChatSession,
  deleteChatSession,
} from "../services/api";

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
  | { type: "streaming"; text: string }
  | { type: "system"; text: string };

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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
        }}
      >
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
        maxWidth: "920px",
        background: "linear-gradient(180deg, #2b1218 0%, #1f0d12 100%)",
        border: "1px solid #7f1d1d",
        borderRadius: "22px",
        padding: "18px",
        color: "#fee2e2",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 900, marginBottom: "12px" }}>
        Request blocked by policy
      </div>

      <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
        Decision: {data.policy.decision}
      </Pill>
      <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
        Category: {data.policy.reason_category || "RESTRICTED_REQUEST"}
      </Pill>
      <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
        Risk: {data.policy.risk_level} ({data.policy.risk_score})
      </Pill>

      <div style={{ marginTop: 12, lineHeight: 1.65 }}>
        {data.policy.user_safe_explanation || "This request is restricted by policy."}
      </div>

      {data.policy.suggested_safe_alternative && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <strong>Try instead:</strong> {data.policy.suggested_safe_alternative}
        </div>
      )}

      {data.policy.matched_rules?.length > 0 && (
        <SectionCard title="Matched policy rules">
          {data.policy.matched_rules.map((rule) => (
            <Pill key={rule} background="#3f1d1d" color="#fecaca" border="#7f1d1d">
              {rule}
            </Pill>
          ))}
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
      }}
    >
      <div>
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
          {data.selected_sources.map((source) => (
            <Pill key={source}>{source}</Pill>
          ))}
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
                <div style={{ fontWeight: 800 }}>{ref.resource_name || ref.title}</div>
                <div style={{ marginTop: "4px", fontSize: "13px", color: "#94a3b8" }}>
                  {ref.source_type} • {ref.resource_path || "No path"}
                </div>
                <div style={{ marginTop: "8px" }}>
                  <Pill>Chunk ID: {ref.chunk_id}</Pill>
                  <Pill>Score: {ref.score?.toFixed?.(4) ?? ref.score}</Pill>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function StreamingAnswerCard({ text }: { text: string }) {
  return (
    <div
      style={{
        maxWidth: "920px",
        background: "linear-gradient(180deg, #0f172a 0%, #0b1325 100%)",
        border: "1px solid #243041",
        borderRadius: "22px",
        padding: "18px",
        color: "#e5e7eb",
      }}
    >
      <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
        Streaming response
      </Pill>

      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginTop: 12 }}>
        {text || "Thinking… waiting for first token"}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, logout, getAccessTokenSilently, isAuthenticated } = useAuth0();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const messages = activeConversation?.messages || [];

  async function getToken() {
    return getAccessTokenSilently({
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: "openid profile email",
      },
    });
  }

  async function persistConversation(conversation: Conversation) {
    try {
      const token = await getToken();
      await updateChatSession(token, conversation);
    } catch (err) {
      console.error("Failed to save chat session", err);
    }
  }

  function scheduleSave(conversation: Conversation) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      persistConversation(conversation);
    }, 500);
  }

  useEffect(() => {
    localStorage.removeItem("datatrust_conversations");
    localStorage.removeItem("datatrust_active_conversation");
  }, []);

  useEffect(() => {
    async function loadHistory() {
      if (!isAuthenticated) return;

      setHistoryLoading(true);
      setError("");

      try {
        const token = await getToken();
        const sessions = await getChatHistory(token);

        setConversations(sessions);

        if (sessions.length > 0) {
          setActiveConversationId(sessions[0].id);
        } else {
          setActiveConversationId(null);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load chat history");
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [isAuthenticated, user?.sub]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  async function createNewChat() {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newConversation: Conversation = {
      id,
      title: "New chat",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(id);
    setError("");

    try {
      const token = await getToken();
      await saveChatSession(token, newConversation);
    } catch (err) {
      console.error("Failed to create chat session", err);
    }
  }

  function updateActiveMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
    setConversations((prev) => {
      let activeId = activeConversationId;
      let working = [...prev];

      if (!activeId || !working.some((c) => c.id === activeId)) {
        activeId = crypto.randomUUID();
        setActiveConversationId(activeId);

        const now = new Date().toISOString();
        working = [
          {
            id: activeId,
            title: "New chat",
            messages: [],
            createdAt: now,
            updatedAt: now,
          },
          ...working,
        ];
      }

      let conversationToSave: Conversation | null = null;

      const next = working.map((conv) => {
        if (conv.id !== activeId) return conv;

        const nextMessages = updater(conv.messages);
        const firstUser = nextMessages.find((m) => m.type === "user") as
          | { type: "user"; text: string }
          | undefined;

        const updated: Conversation = {
          ...conv,
          title:
            conv.title === "New chat" && firstUser?.text
              ? firstUser.text.slice(0, 42)
              : conv.title,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };

        conversationToSave = updated;
        return updated;
      });

      if (conversationToSave) {
        scheduleSave(conversationToSave);
      }

      return next;
    });
  }

  async function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));

    if (id === activeConversationId) {
      setActiveConversationId(null);
    }

    try {
      const token = await getToken();
      await deleteChatSession(token, id);
    } catch (err) {
      console.error("Failed to delete chat session", err);
    }
  }

  function stopRequest() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);

    updateActiveMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];

      if (last?.type === "streaming") {
        copy.pop();
        copy.push({
          type: "system",
          text: "Request stopped.",
        });
      }

      return copy;
    });
  }

  async function handleSend() {
    if (!text.trim()) return;

    if (loading) {
      stopRequest();
      return;
    }

    const userText = text.trim();
    setText("");
    setLoading(true);
    setError("");

    updateActiveMessages((prev) => [
      ...prev,
      { type: "user", text: userText },
      { type: "streaming", text: "" },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await getToken();

      await streamChatWithToken(
        token,
        userText,
        {
          onToken: (tokenChunk) => {
            updateActiveMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];

              if (last?.type !== "streaming") return prev;

              copy[copy.length - 1] = {
                ...last,
                text: (last.text || "") + tokenChunk,
              };

              return copy;
            });
          },

          onDone: (finalPayload) => {
            updateActiveMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];

              if (last?.type === "streaming") copy.pop();

              if (finalPayload?.status === "blocked") {
                copy.push({ type: "blocked", data: finalPayload });
              } else if (finalPayload) {
                copy.push({ type: "answer", data: finalPayload });
              } else {
                copy.push({
                  type: "system",
                  text: "Streaming completed but no final payload was returned.",
                });
              }

              return copy;
            });
          },

          onBlocked: (blockedPayload) => {
            const data = blockedPayload?.detail ?? blockedPayload;

            updateActiveMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];

              if (last?.type === "streaming") copy.pop();

              copy.push({ type: "blocked", data });
              return copy;
            });
          },

          onError: (message) => {
            if (controller.signal.aborted) return;

            updateActiveMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];

              if (last?.type === "streaming") copy.pop();

              copy.push({
                type: "system",
                text: `Error: ${message}`,
              });

              return copy;
            });

            setError(message);
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }

      const message =
        err?.name === "AbortError"
          ? "Request stopped."
          : err?.message === "AUTH_REQUIRED"
          ? "Your session expired. Please sign in again."
          : err?.message || "Request failed";

      updateActiveMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];

        if (last?.type === "streaming") copy.pop();

        copy.push({ type: "system", text: message });
        return copy;
      });

      setError(message);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }

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
          width: "310px",
          borderRight: "1px solid #1e293b",
          padding: "22px",
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(14px)",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "22px", fontWeight: 900 }}>DataTrust</div>
          <div style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
            Private, policy-aware AI assistant
          </div>
        </div>

        <button
          onClick={createNewChat}
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
          + New Chat
        </button>

        <div style={{ marginTop: 18 }}>
          {historyLoading && (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading history...</div>
          )}

          {conversations.map((conv) => (
            <div
              key={conv.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <button
                onClick={() => setActiveConversationId(conv.id)}
                style={{
                  flex: 1,
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border:
                    conv.id === activeConversationId
                      ? "1px solid #3b82f6"
                      : "1px solid #1e293b",
                  background:
                    conv.id === activeConversationId ? "#10203a" : "#0b1220",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>{conv.title}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {new Date(conv.updatedAt).toLocaleString()}
                </div>
              </button>

              <button
                onClick={() => deleteConversation(conv.id)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid #3f1d1d",
                  background: "#1f0d12",
                  color: "#fca5a5",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "22px", color: "#94a3b8", fontSize: "13px" }}>
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
              Authenticated with Auth0. Authorization enforced by DataTrust backend.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: "999px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                {user.picture && (
                  <img
                    src={user.picture}
                    alt="avatar"
                    style={{ width: 22, height: 22, borderRadius: "50%" }}
                  />
                )}
                <span>{user.name || user.email}</span>
              </div>
            )}

            <button
              onClick={() =>
                logout({
                  logoutParams: {
                    returnTo: window.location.origin + "/login",
                  },
                })
              }
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid #7f1d1d",
                background: "#3f1d1d",
                color: "#fca5a5",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
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
              <div style={{ fontSize: "34px", fontWeight: 900, color: "#f8fafc" }}>
                Ask your internal assistant
              </div>
              <div style={{ marginTop: 10, fontSize: "15px", lineHeight: 1.7, color: "#94a3b8" }}>
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
                  }}
                >
                  {message.text}
                </div>
              )}

              {message.type === "blocked" && <BlockedMessageCard data={message.data} />}
              {message.type === "answer" && <AnswerCard data={message.data} />}
              {message.type === "streaming" && <StreamingAnswerCard text={message.text} />}

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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
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
              }}
              placeholder="Ask about internal docs, repos, runbooks, or architecture..."
            />

            <button
              onClick={loading ? stopRequest : handleSend}
              style={{
                minWidth: "120px",
                height: "52px",
                borderRadius: "16px",
                border: loading ? "1px solid #7f1d1d" : "1px solid #1d4ed8",
                background: loading
                  ? "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)"
                  : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "white",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "14px",
              }}
            >
              {loading ? "Stop" : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
// import { useEffect, useMemo, useRef, useState } from "react";
// import { useAuth0 } from "@auth0/auth0-react";
// import { streamChatWithToken } from "../services/api";

// type ChatApiResponse = {
//   status: string;
//   answer: string | null;
//   policy: {
//     status: string;
//     decision: string;
//     code?: string | null;
//     reason_category?: string | null;
//     user_safe_explanation?: string | null;
//     suggested_safe_alternative?: string | null;
//     matched_rules: string[];
//     categories: string[];
//     action: string;
//     risk_level: string;
//     risk_score: number;
//   };
//   selected_sources: string[];
//   source_references: Array<{
//     chunk_id: number;
//     document_id: number;
//     title?: string | null;
//     resource_path?: string | null;
//     source_type?: string | null;
//     resource_name?: string | null;
//     score: number;
//   }>;
//   retrieval_count: number;
//   metadata: Record<string, any>;
// };

// type ChatMessage =
//   | { type: "user"; text: string }
//   | { type: "blocked"; data: ChatApiResponse }
//   | { type: "answer"; data: ChatApiResponse }
//   | { type: "streaming"; text: string }
//   | { type: "system"; text: string };

// type Conversation = {
//   id: string;
//   title: string;
//   messages: ChatMessage[];
//   createdAt: string;
//   updatedAt: string;
// };

// const STORAGE_KEY = "datatrust_conversations";
// const ACTIVE_KEY = "datatrust_active_conversation";

// function Pill({
//   children,
//   background = "#1f2937",
//   color = "#e5e7eb",
//   border = "#374151",
// }: {
//   children: React.ReactNode;
//   background?: string;
//   color?: string;
//   border?: string;
// }) {
//   return (
//     <span
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         padding: "6px 10px",
//         borderRadius: "999px",
//         background,
//         color,
//         border: `1px solid ${border}`,
//         fontSize: "12px",
//         fontWeight: 600,
//         marginRight: "8px",
//         marginBottom: "8px",
//       }}
//     >
//       {children}
//     </span>
//   );
// }

// function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <div
//       style={{
//         marginTop: "14px",
//         borderRadius: "18px",
//         border: "1px solid #223046",
//         background: "rgba(15, 23, 42, 0.88)",
//         padding: "14px",
//       }}
//     >
//       <div
//         style={{
//           fontSize: "13px",
//           fontWeight: 800,
//           color: "#cbd5e1",
//           marginBottom: "10px",
//         }}
//       >
//         {title}
//       </div>
//       {children}
//     </div>
//   );
// }

// function BlockedMessageCard({ data }: { data: ChatApiResponse }) {
//   return (
//     <div
//       style={{
//         maxWidth: "920px",
//         background: "linear-gradient(180deg, #2b1218 0%, #1f0d12 100%)",
//         border: "1px solid #7f1d1d",
//         borderRadius: "22px",
//         padding: "18px",
//         color: "#fee2e2",
//       }}
//     >
//       <div style={{ fontSize: "16px", fontWeight: 900, marginBottom: "12px" }}>
//         Request blocked by policy
//       </div>

//       <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
//         Decision: {data.policy.decision}
//       </Pill>
//       <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
//         Category: {data.policy.reason_category || "RESTRICTED_REQUEST"}
//       </Pill>
//       <Pill background="#3f1d1d" color="#fecaca" border="#7f1d1d">
//         Risk: {data.policy.risk_level} ({data.policy.risk_score})
//       </Pill>

//       <div style={{ marginTop: 12, lineHeight: 1.65 }}>
//         {data.policy.user_safe_explanation || "This request is restricted by policy."}
//       </div>

//       {data.policy.suggested_safe_alternative && (
//         <div
//           style={{
//             marginTop: "12px",
//             padding: "12px",
//             borderRadius: "14px",
//             background: "rgba(255,255,255,0.04)",
//           }}
//         >
//           <strong>Try instead:</strong> {data.policy.suggested_safe_alternative}
//         </div>
//       )}

//       {data.policy.matched_rules?.length > 0 && (
//         <SectionCard title="Matched policy rules">
//           {data.policy.matched_rules.map((rule) => (
//             <Pill key={rule} background="#3f1d1d" color="#fecaca" border="#7f1d1d">
//               {rule}
//             </Pill>
//           ))}
//         </SectionCard>
//       )}
//     </div>
//   );
// }

// function AnswerCard({ data }: { data: ChatApiResponse }) {
//   return (
//     <div
//       style={{
//         maxWidth: "920px",
//         background: "linear-gradient(180deg, #0f172a 0%, #0b1325 100%)",
//         border: "1px solid #243041",
//         borderRadius: "22px",
//         padding: "18px",
//         color: "#e5e7eb",
//       }}
//     >
//       <div>
//         <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
//           Decision: {data.policy.decision}
//         </Pill>
//         <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
//           Action: {data.policy.action}
//         </Pill>
//         <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
//           Risk: {data.policy.risk_level}
//         </Pill>
//         <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
//           Retrieved: {data.retrieval_count}
//         </Pill>
//       </div>

//       <div
//         style={{
//           whiteSpace: "pre-wrap",
//           lineHeight: 1.7,
//           fontSize: "15px",
//           color: "#e2e8f0",
//           padding: "14px",
//           borderRadius: "16px",
//           background: "rgba(255,255,255,0.03)",
//           border: "1px solid rgba(255,255,255,0.06)",
//         }}
//       >
//         {data.answer || "No answer returned."}
//       </div>

//       {data.selected_sources?.length > 0 && (
//         <SectionCard title="Selected sources">
//           {data.selected_sources.map((source) => (
//             <Pill key={source}>{source}</Pill>
//           ))}
//         </SectionCard>
//       )}

//       {data.source_references?.length > 0 && (
//         <SectionCard title="Source references">
//           <div style={{ display: "grid", gap: "10px" }}>
//             {data.source_references.map((ref) => (
//               <div
//                 key={ref.chunk_id}
//                 style={{
//                   borderRadius: "14px",
//                   border: "1px solid #243041",
//                   background: "#101928",
//                   padding: "12px",
//                 }}
//               >
//                 <div style={{ fontWeight: 800 }}>{ref.resource_name || ref.title}</div>
//                 <div style={{ marginTop: "4px", fontSize: "13px", color: "#94a3b8" }}>
//                   {ref.source_type} • {ref.resource_path || "No path"}
//                 </div>
//                 <div style={{ marginTop: "8px" }}>
//                   <Pill>Chunk ID: {ref.chunk_id}</Pill>
//                   <Pill>Score: {ref.score?.toFixed?.(4) ?? ref.score}</Pill>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </SectionCard>
//       )}
//     </div>
//   );
// }

// function StreamingAnswerCard({ text }: { text: string }) {
//   return (
//     <div
//       style={{
//         maxWidth: "920px",
//         background: "linear-gradient(180deg, #0f172a 0%, #0b1325 100%)",
//         border: "1px solid #243041",
//         borderRadius: "22px",
//         padding: "18px",
//         color: "#e5e7eb",
//       }}
//     >
//       <Pill background="#10203a" color="#bfdbfe" border="#1d4ed8">
//         Streaming response
//       </Pill>

//       <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginTop: 12 }}>
//         {text || "Thinking… waiting for first token"}
//       </div>
//     </div>
//   );
// }

// export default function ChatPage() {
//   const { user, logout, getAccessTokenSilently } = useAuth0();

//   const [text, setText] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const abortControllerRef = useRef<AbortController | null>(null);

//   const [conversations, setConversations] = useState<Conversation[]>(() => {
//     try {
//       const saved = localStorage.getItem(STORAGE_KEY);
//       return saved ? JSON.parse(saved) : [];
//     } catch {
//       return [];
//     }
//   });

//   const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
//     return localStorage.getItem(ACTIVE_KEY);
//   });

//   const activeConversation = useMemo(
//     () => conversations.find((c) => c.id === activeConversationId) || null,
//     [conversations, activeConversationId]
//   );

//   const messages = activeConversation?.messages || [];

//   useEffect(() => {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
//   }, [conversations]);

//   useEffect(() => {
//     if (activeConversationId) {
//       localStorage.setItem(ACTIVE_KEY, activeConversationId);
//     }
//   }, [activeConversationId]);

//   function createNewChat() {
//     const id = crypto.randomUUID();
//     const now = new Date().toISOString();

//     const newConversation: Conversation = {
//       id,
//       title: "New chat",
//       messages: [],
//       createdAt: now,
//       updatedAt: now,
//     };

//     setConversations((prev) => [newConversation, ...prev]);
//     setActiveConversationId(id);
//     setError("");
//   }

//   function updateActiveMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
//     setConversations((prev) => {
//       let activeId = activeConversationId;

//       if (!activeId || !prev.some((c) => c.id === activeId)) {
//         activeId = crypto.randomUUID();
//         setActiveConversationId(activeId);

//         const now = new Date().toISOString();
//         prev = [
//           {
//             id: activeId,
//             title: "New chat",
//             messages: [],
//             createdAt: now,
//             updatedAt: now,
//           },
//           ...prev,
//         ];
//       }

//       return prev.map((conv) => {
//         if (conv.id !== activeId) return conv;

//         const nextMessages = updater(conv.messages);
//         const firstUser = nextMessages.find((m) => m.type === "user") as
//           | { type: "user"; text: string }
//           | undefined;

//         return {
//           ...conv,
//           title:
//             conv.title === "New chat" && firstUser?.text
//               ? firstUser.text.slice(0, 42)
//               : conv.title,
//           messages: nextMessages,
//           updatedAt: new Date().toISOString(),
//         };
//       });
//     });
//   }

//   function deleteConversation(id: string) {
//     setConversations((prev) => prev.filter((c) => c.id !== id));

//     if (id === activeConversationId) {
//       setActiveConversationId(null);
//       localStorage.removeItem(ACTIVE_KEY);
//     }
//   }

//   function stopRequest() {
//   abortControllerRef.current?.abort();
//   abortControllerRef.current = null;
//   setLoading(false);

//   updateActiveMessages((prev) => {
//     const copy = [...prev];
//     const last = copy[copy.length - 1];

//     if (last?.type === "streaming") {
//       copy.pop();
//       copy.push({
//         type: "system",
//         text: "Request stopped.",
//       });
//     }

//     return copy;
//   });
// }

//   async function handleSend() {
//     if (!text.trim() || loading) return;

//     const userText = text.trim();
//     setText("");
//     setLoading(true);
//     setError("");

//     updateActiveMessages((prev) => [
//       ...prev,
//       { type: "user", text: userText },
//       { type: "streaming", text: "" },
//     ]);

//     try {
      
//       const token = await getAccessTokenSilently({
//         authorizationParams: {
//         audience: import.meta.env.VITE_AUTH0_AUDIENCE,
//         scope: "openid profile email",
//         },
//       });

//       const controller = new AbortController();
//       abortControllerRef.current = controller;

//       await streamChatWithToken(token, userText, {
//         onToken: (tokenChunk) => {
//           updateActiveMessages((prev) => {
//             const copy = [...prev];
//             const last = copy[copy.length - 1];

//             if (last?.type !== "streaming") return prev;

//             copy[copy.length - 1] = {
//               ...last,
//               text: (last.text || "") + tokenChunk,
//             };

//             return copy;
//           });
//         },

//         onDone: (finalPayload) => {
//           updateActiveMessages((prev) => {
//             const copy = [...prev];
//             const last = copy[copy.length - 1];

//             if (last?.type === "streaming") copy.pop();

//             if (finalPayload?.status === "blocked") {
//               copy.push({ type: "blocked", data: finalPayload });
//             } else if (finalPayload) {
//               copy.push({ type: "answer", data: finalPayload });
//             } else {
//               copy.push({
//                 type: "system",
//                 text: "Streaming completed but no final payload was returned.",
//               });
//             }

//             return copy;
//           });

//           setLoading(false);
//         },

//         onBlocked: (blockedPayload) => {
//           const data = blockedPayload?.detail ?? blockedPayload;

//           updateActiveMessages((prev) => {
//             const copy = [...prev];
//             const last = copy[copy.length - 1];

//             if (last?.type === "streaming") copy.pop();

//             copy.push({ type: "blocked", data });
//             return copy;
//           });

//           setLoading(false);
//         },

//         onError: (message) => {
//           updateActiveMessages((prev) => {
//             const copy = [...prev];
//             const last = copy[copy.length - 1];

//             if (last?.type === "streaming") copy.pop();

//             copy.push({
//               type: "system",
//               text: `Error: ${message}`,
//             });

//             return copy;
//           });

//           setError(message);
//           setLoading(false);
//         },
//       });
//     } catch (err: any) {
//       const message =
//         err?.message === "AUTH_REQUIRED"
//           ? "Your session expired. Please sign in again."
//           : err?.message || "Request failed";

//       updateActiveMessages((prev) => {
//         const copy = [...prev];
//         const last = copy[copy.length - 1];

//         if (last?.type === "streaming") copy.pop();

//         copy.push({ type: "system", text: message });
//         return copy;
//       });

//       setError(message);
//       setLoading(false);
//     }
//   }

//   return (
//     <div
//       style={{
//         display: "flex",
//         height: "100vh",
//         background:
//           "radial-gradient(circle at top left, #172554 0%, #020617 35%, #030712 100%)",
//         color: "white",
//       }}
//     >
//       <aside
//         style={{
//           width: "310px",
//           borderRight: "1px solid #1e293b",
//           padding: "22px",
//           background: "rgba(2, 6, 23, 0.88)",
//           backdropFilter: "blur(14px)",
//           overflowY: "auto",
//         }}
//       >
//         <div style={{ marginBottom: "20px" }}>
//           <div style={{ fontSize: "22px", fontWeight: 900 }}>DataTrust</div>
//           <div style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
//             Private, policy-aware AI assistant
//           </div>
//         </div>

//         <button
//           onClick={createNewChat}
//           style={{
//             width: "100%",
//             padding: "12px 14px",
//             borderRadius: "14px",
//             border: "1px solid #253245",
//             background: "linear-gradient(180deg, #111827 0%, #0b1220 100%)",
//             color: "#f8fafc",
//             cursor: "pointer",
//             fontWeight: 700,
//           }}
//         >
//           + New Chat
//         </button>

//         <div style={{ marginTop: 18 }}>
//           {conversations.map((conv) => (
//             <div
//               key={conv.id}
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 8,
//                 marginBottom: 8,
//               }}
//             >
//               <button
//                 onClick={() => setActiveConversationId(conv.id)}
//                 style={{
//                   flex: 1,
//                   textAlign: "left",
//                   padding: "10px 12px",
//                   borderRadius: 12,
//                   border:
//                     conv.id === activeConversationId
//                       ? "1px solid #3b82f6"
//                       : "1px solid #1e293b",
//                   background:
//                     conv.id === activeConversationId ? "#10203a" : "#0b1220",
//                   color: "white",
//                   cursor: "pointer",
//                 }}
//               >
//                 <div style={{ fontWeight: 700, fontSize: 13 }}>{conv.title}</div>
//                 <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
//                   {new Date(conv.updatedAt).toLocaleString()}
//                 </div>
//               </button>

//               <button
//                 onClick={() => deleteConversation(conv.id)}
//                 style={{
//                   width: 34,
//                   height: 34,
//                   borderRadius: 10,
//                   border: "1px solid #3f1d1d",
//                   background: "#1f0d12",
//                   color: "#fca5a5",
//                   cursor: "pointer",
//                 }}
//               >
//                 ×
//               </button>
//             </div>
//           ))}
//         </div>

//         <div style={{ marginTop: "22px", color: "#94a3b8", fontSize: "13px" }}>
//           Suggested prompts:
//           <div style={{ marginTop: "10px", display: "grid", gap: "8px", lineHeight: 1.5 }}>
//             <div>• Summarize backend deployment architecture docs</div>
//             <div>• Show restricted architecture decisions</div>
//             <div>• Give me all ssns</div>
//           </div>
//         </div>
//       </aside>

//       <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
//         <div
//           style={{
//             padding: "18px 24px",
//             borderBottom: "1px solid #1e293b",
//             background: "rgba(4, 17, 43, 0.75)",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <div>
//             <div style={{ fontWeight: 900, fontSize: "18px" }}>
//               Secure Internal Assistant
//             </div>
//             <div style={{ marginTop: "4px", fontSize: "13px", color: "#94a3b8" }}>
//               Authenticated with Auth0. Authorization enforced by DataTrust backend.
//             </div>
//           </div>

//           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//             {user && (
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 8,
//                   padding: "6px 12px",
//                   borderRadius: "999px",
//                   border: "1px solid #334155",
//                   background: "#0f172a",
//                   fontSize: "13px",
//                   color: "#94a3b8",
//                 }}
//               >
//                 {user.picture && (
//                   <img
//                     src={user.picture}
//                     alt="avatar"
//                     style={{ width: 22, height: 22, borderRadius: "50%" }}
//                   />
//                 )}
//                 <span>{user.name || user.email}</span>
//               </div>
//             )}

//             <button
//               onClick={() =>
//                 logout({
//                   logoutParams: {
//                     returnTo: window.location.origin + "/login",
//                   },
//                 })
//               }
//               style={{
//                 padding: "8px 16px",
//                 borderRadius: "10px",
//                 border: "1px solid #7f1d1d",
//                 background: "#3f1d1d",
//                 color: "#fca5a5",
//                 fontSize: "13px",
//                 fontWeight: 700,
//                 cursor: "pointer",
//               }}
//             >
//               Sign Out
//             </button>
//           </div>
//         </div>

//         <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
//           {messages.length === 0 && (
//             <div
//               style={{
//                 maxWidth: "760px",
//                 margin: "40px auto 0",
//                 textAlign: "center",
//                 color: "#cbd5e1",
//               }}
//             >
//               <div style={{ fontSize: "34px", fontWeight: 900, color: "#f8fafc" }}>
//                 Ask your internal assistant
//               </div>
//               <div style={{ marginTop: 10, fontSize: "15px", lineHeight: 1.7, color: "#94a3b8" }}>
//                 DataTrust evaluates policy, checks department and level access,
//                 retrieves only approved internal content, and generates a guarded answer.
//               </div>
//             </div>
//           )}

//           {messages.map((message, idx) => (
//             <div key={idx} style={{ marginBottom: "20px" }}>
//               {message.type === "user" && (
//                 <div
//                   style={{
//                     marginLeft: "auto",
//                     maxWidth: "760px",
//                     padding: "15px 18px",
//                     borderRadius: "20px",
//                     background:
//                       "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)",
//                     color: "white",
//                   }}
//                 >
//                   {message.text}
//                 </div>
//               )}

//               {message.type === "blocked" && <BlockedMessageCard data={message.data} />}
//               {message.type === "answer" && <AnswerCard data={message.data} />}
//               {message.type === "streaming" && <StreamingAnswerCard text={message.text} />}

//               {message.type === "system" && (
//                 <div
//                   style={{
//                     maxWidth: "760px",
//                     background: "#111827",
//                     color: "#e5e7eb",
//                     padding: "14px 16px",
//                     borderRadius: "16px",
//                     border: "1px solid #243041",
//                   }}
//                 >
//                   {message.text}
//                 </div>
//               )}
//             </div>
//           ))}

//           {loading && (
//             <div style={{ color: "#93c5fd", fontSize: "14px", marginTop: "10px" }}>
//               Processing request...
//             </div>
//           )}

//           {error && (
//             <div
//               style={{
//                 marginTop: "12px",
//                 background: "#3f1d1d",
//                 color: "#fecaca",
//                 padding: "12px",
//                 borderRadius: "12px",
//                 border: "1px solid #7f1d1d",
//               }}
//             >
//               {error}
//             </div>
//           )}
//         </div>

//         <div
//           style={{
//             padding: "18px 24px",
//             borderTop: "1px solid #1e293b",
//             background: "rgba(4, 17, 43, 0.75)",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               gap: "12px",
//               alignItems: "flex-end",
//               maxWidth: "1100px",
//               margin: "0 auto",
//             }}
//           >
//             <textarea
//               value={text}
//               onChange={(e) => setText(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" && !e.shiftKey) {
//                   e.preventDefault();
//                   handleSend();
//                 }
//               }}
//               rows={3}
//               style={{
//                 flex: 1,
//                 padding: "16px",
//                 borderRadius: "16px",
//                 border: "1px solid #334155",
//                 background: "#f8fafc",
//                 color: "#111827",
//                 resize: "none",
//                 fontSize: "14px",
//                 lineHeight: 1.5,
//               }}
//               placeholder="Ask about internal docs, repos, runbooks, or architecture..."
//             />

//             <button
//               onClick={handleSend}
//               disabled={loading}
//               style={{
//                 minWidth: "120px",
//                 height: "52px",
//                 borderRadius: "16px",
//                 border: "1px solid #1d4ed8",
//                 background: loading
//                   ? "#475569"
//                   : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
//                 color: "white",
//                 cursor: loading ? "not-allowed" : "pointer",
//                 fontWeight: 800,
//                 fontSize: "14px",
//               }}
//             >
//               {loading ? "Loading..." : "Send"}
//             </button>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }