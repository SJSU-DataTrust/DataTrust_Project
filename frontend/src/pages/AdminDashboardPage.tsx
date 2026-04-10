import { useEffect, useState } from "react";
import {
  getAdminSummary,
  getAdminRecentBlocked,
  getAdminRecentEvents,
  getAdminRecentChat,
  getAdminChartData,
} from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

type Props = {
  adminUserId: string;
};

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #0b1325 100%)",
        border: "1px solid #243041",
        borderRadius: "18px",
        padding: "18px",
        minHeight: "100px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "10px" }}>
        {title}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: "#f8fafc" }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: "18px",
        background: "linear-gradient(180deg, #0f172a 0%, #0b1325 100%)",
        border: "1px solid #243041",
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", marginBottom: "14px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function AdminDashboardPage({ adminUserId }: Props) {
  const [summary, setSummary] = useState<any>(null);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [recentChat, setRecentChat] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [summaryData, blockedData, eventsData, chatData, charts] = await Promise.all([
          getAdminSummary(adminUserId),
          getAdminRecentBlocked(adminUserId),
          getAdminRecentEvents(adminUserId),
          getAdminRecentChat(adminUserId),
          getAdminChartData(adminUserId),
        ]);

        if (!mounted) return;
        setSummary(summaryData);
        setBlocked(blockedData);
        setEvents(eventsData);
        setRecentChat(chatData);
        setChartData(charts);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [adminUserId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #172554 0%, #020617 35%, #030712 100%)",
        color: "white",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "30px", fontWeight: 900, color: "#f8fafc" }}>
            DataTrust Admin Dashboard
          </div>
          <div style={{ marginTop: "6px", color: "#94a3b8" }}>
            Security, ingestion, and usage visibility
          </div>
        </div>

        {loading && <div style={{ color: "#93c5fd" }}>Loading dashboard...</div>}
        {error && (
          <div
            style={{
              background: "#3f1d1d",
              color: "#fecaca",
              border: "1px solid #7f1d1d",
              borderRadius: "14px",
              padding: "14px",
            }}
          >
            {error}
          </div>
        )}

        {summary && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              <MetricCard title="Total Users" value={summary.metrics.total_users} />
              <MetricCard title="Resource Scopes" value={summary.metrics.total_scopes} />
              <MetricCard title="Documents Indexed" value={summary.metrics.total_documents} />
              <MetricCard title="Active Chunks" value={summary.metrics.active_chunks} />
              <MetricCard title="Blocked Requests" value={summary.metrics.blocked_requests} />
              <MetricCard title="Generated Answers" value={summary.metrics.generated_answers} />
              <MetricCard title="No Authorized Context" value={summary.metrics.no_authorized_context} />
              <MetricCard title="Successful Ingestions" value={summary.metrics.successful_ingestions} />
            </div>

            {chartData && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "18px",
                  marginTop: "18px",
                }}
              >
                <Section title="Request Outcomes">
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData.request_outcomes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>

                <Section title="Documents by Department">
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={chartData.documents_by_department}
                          dataKey="value"
                          nameKey="label"
                          outerRadius={90}
                          label
                        >
                          {chartData.documents_by_department.map((_: any, index: number) => (
                            <Cell key={index} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              </div>
            )}

            {chartData && (
              <Section title="Ingestion Events by Type">
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData.ingestion_events}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            <Section title="Recent Blocked Requests">
              <div style={{ display: "grid", gap: "10px" }}>
                {blocked.length === 0 ? (
                  <div style={{ color: "#94a3b8" }}>No blocked requests yet.</div>
                ) : (
                  blocked.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #243041",
                        borderRadius: "14px",
                        padding: "12px",
                        background: "#101928",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{item.reason_category || "BLOCKED"}</div>
                      <div style={{ marginTop: "4px", color: "#cbd5e1" }}>{item.prompt}</div>
                      <div style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
                        {item.email} • {item.department} • {item.auth_level} • Risk {item.risk_score}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Recent Ingestion / Sync Events">
              <div style={{ display: "grid", gap: "10px" }}>
                {events.length === 0 ? (
                  <div style={{ color: "#94a3b8" }}>No sync events yet.</div>
                ) : (
                  events.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #243041",
                        borderRadius: "14px",
                        padding: "12px",
                        background: "#101928",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{item.event_type}</div>
                      <div style={{ marginTop: "6px", color: "#cbd5e1", fontSize: "14px" }}>
                        {item.summary.file_path || item.summary.external_doc_id || "No path"}
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
                        Source: {item.summary.source_code || "N/A"} • Dept: {item.summary.department_code || "N/A"} • Level: {item.summary.level_code || "N/A"} • Chunks: {item.summary.chunk_count ?? "N/A"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Recent Chat Activity">
              <div style={{ display: "grid", gap: "10px" }}>
                {recentChat.length === 0 ? (
                  <div style={{ color: "#94a3b8" }}>No chat activity yet.</div>
                ) : (
                  recentChat.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #243041",
                        borderRadius: "14px",
                        padding: "12px",
                        background: "#101928",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{item.event_type}</div>
                      <div style={{ marginTop: "4px", color: "#cbd5e1" }}>{item.query}</div>
                      <div style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
                        Status: {item.status || "N/A"} • Request ID: {item.request_id || "N/A"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}