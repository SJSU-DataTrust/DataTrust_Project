import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

import {
  getAdminSummary,
  getDocumentsBySource,
  getDocumentsByDepartment,
  getChunksByLevel,
  getRecentDocuments,
  getDataQuality,
  getConnectorHealth,
  getIngestionProgress,
  getPolicyViolationsChart,
  getUserActivityHeatmap,
  runConfluenceSync,
  runGithubSync,
  runGoogleDriveSync,
} from "../services/api";

const ADMIN_USER_ID = "e483f8b4-1529-4a2a-a2ae-7922f4d0157a";

/**
 * Turn this ON for poster screenshot if your backend has incomplete data.
 * Turn it OFF for real demo.
 */
const POSTER_SCREENSHOT_MODE = false;

type Summary = {
  total_documents: number;
  active_documents: number;
  total_chunks: number;
  active_chunks: number;
  total_users: number;
  active_users: number;
  admin_users: number;
};

type ChartRow = {
  name: string;
  value: number;
};

type ConnectorHealth = {
  source: string;
  status: "healthy" | "warning" | "failed" | string;
  document_count: number;
  failure_count: number;
  last_sync_at?: string | null;
};

type RecentDoc = {
  id: number | string;
  title: string;
  sync_status?: string;
  resource_path?: string;
  source_systems?: { code?: string };
  departments?: { code?: string };
  auth_levels?: { code?: string };
};

type DataQuality = {
  status: string;
  local_path_issues: number;
  empty_chunks: number;
  inactive_chunks: number;
};

type IngestionProgress = {
  total_recent_documents: number;
  active_or_updated: number;
  no_change: number;
  failed: number;
};

type PolicyPoint = {
  date: string;
  violations: number;
};

type HeatmapCell = {
  date: string;
  day: string;
  count: number;
};

const mockSummary: Summary = {
  total_documents: 42,
  active_documents: 39,
  total_chunks: 186,
  active_chunks: 178,
  total_users: 13,
  active_users: 13,
  admin_users: 1,
};

const mockBySource: ChartRow[] = [
  { name: "Confluence", value: 27 },
  { name: "GitHub", value: 9 },
  { name: "Drive", value: 6 },
];

const mockByDepartment: ChartRow[] = [
  { name: "TECH", value: 16 },
  { name: "HR", value: 10 },
  { name: "FINANCE", value: 8 },
  { name: "OPS", value: 8 },
];

const mockByLevel: ChartRow[] = [
  { name: "L1", value: 68 },
  { name: "L2", value: 57 },
  { name: "L3", value: 53 },
];

const mockConnectorHealth: ConnectorHealth[] = [
  {
    source: "GitHub",
    status: "healthy",
    document_count: 9,
    failure_count: 0,
    last_sync_at: "2026-05-08 10:42 AM",
  },
  {
    source: "Confluence",
    status: "healthy",
    document_count: 27,
    failure_count: 0,
    last_sync_at: "2026-05-08 10:39 AM",
  },
  {
    source: "Google Drive",
    status: "healthy",
    document_count: 6,
    failure_count: 0,
    last_sync_at: "2026-05-08 10:35 AM",
  },
];

const mockIngestionProgress: IngestionProgress = {
  total_recent_documents: 42,
  active_or_updated: 39,
  no_change: 3,
  failed: 0,
};

const mockPolicyChart: PolicyPoint[] = [
  { date: "Apr 01", violations: 1 },
  { date: "Apr 08", violations: 3 },
  { date: "Apr 15", violations: 2 },
  { date: "Apr 22", violations: 5 },
  { date: "Apr 29", violations: 4 },
  { date: "May 06", violations: 7 },
];

const mockRecentDocs: RecentDoc[] = [
  {
    id: 1,
    title: "Backend Architecture & Data Layer",
    source_systems: { code: "CONFLUENCE" },
    departments: { code: "TECH" },
    auth_levels: { code: "L1" },
    sync_status: "active",
    resource_path: "confluence://BC/TECH/L1/backend-architecture",
  },
  {
    id: 2,
    title: "Admin Dashboard Architecture",
    source_systems: { code: "CONFLUENCE" },
    departments: { code: "TECH" },
    auth_levels: { code: "L2" },
    sync_status: "active",
    resource_path: "confluence://BC/TECH/L2/admin-dashboard",
  },
  {
    id: 3,
    title: "Borcella Admin Frontend",
    source_systems: { code: "GITHUB" },
    departments: { code: "TECH" },
    auth_levels: { code: "L1" },
    sync_status: "active",
    resource_path: "github://SJSU-DataTrust/Borcella-Commerce/borcella_admin",
  },
  {
    id: 4,
    title: "HR Leave Requests",
    source_systems: { code: "GOOGLE_DRIVE" },
    departments: { code: "HR" },
    auth_levels: { code: "L1" },
    sync_status: "active",
    resource_path: "gdrive://hr_data/L1/leave_request.csv",
  },
  {
    id: 5,
    title: "Compensation & Pay Bands",
    source_systems: { code: "CONFLUENCE" },
    departments: { code: "HR" },
    auth_levels: { code: "L3" },
    sync_status: "active",
    resource_path: "confluence://BC/HR/L3/compensation",
  },
];

const mockQuality: DataQuality = {
  status: "healthy",
  local_path_issues: 0,
  empty_chunks: 0,
  inactive_chunks: 0,
};

function buildMockHeatmap(): HeatmapCell[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cells: HeatmapCell[] = [];

  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const count = [0, 2, 5, 8, 12, 3, 1][(week + day) % 7];
      cells.push({
        date: `Week ${week + 1}, ${days[day]}`,
        day: days[day],
        count,
      });
    }
  }

  return cells;
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bySource, setBySource] = useState<ChartRow[]>([]);
  const [byDepartment, setByDepartment] = useState<ChartRow[]>([]);
  const [byLevel, setByLevel] = useState<ChartRow[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [quality, setQuality] = useState<DataQuality | null>(null);
  const [connectorHealth, setConnectorHealth] = useState<ConnectorHealth[]>([]);
  const [ingestionProgress, setIngestionProgress] = useState<IngestionProgress | null>(null);
  const [policyChart, setPolicyChart] = useState<PolicyPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  const dataQualityLabel = quality?.status || "unknown";

  async function loadDashboard(showError = true) {
    if (POSTER_SCREENSHOT_MODE) {
      setSummary(mockSummary);
      setBySource(mockBySource);
      setByDepartment(mockByDepartment);
      setByLevel(mockByLevel);
      setRecentDocs(mockRecentDocs);
      setQuality(mockQuality);
      setConnectorHealth(mockConnectorHealth);
      setIngestionProgress(mockIngestionProgress);
      setPolicyChart(mockPolicyChart);
      setHeatmap(buildMockHeatmap());
      setError("");
      return;
    }

    try {
      setError("");

      const results = await Promise.allSettled([
        getAdminSummary(ADMIN_USER_ID),
        getDocumentsBySource(ADMIN_USER_ID),
        getDocumentsByDepartment(ADMIN_USER_ID),
        getChunksByLevel(ADMIN_USER_ID),
        getRecentDocuments(ADMIN_USER_ID),
        getDataQuality(ADMIN_USER_ID),
        getConnectorHealth(ADMIN_USER_ID),
        getIngestionProgress(ADMIN_USER_ID),
        getPolicyViolationsChart(ADMIN_USER_ID),
        getUserActivityHeatmap(ADMIN_USER_ID),
      ]);

      const value = <T,>(i: number, fallback: T): T =>
        results[i].status === "fulfilled"
          ? (results[i] as PromiseFulfilledResult<T>).value
          : fallback;

      setSummary(value(0, summary));
      setBySource(value(1, bySource));
      setByDepartment(value(2, byDepartment));
      setByLevel(value(3, byLevel));
      setRecentDocs(value(4, recentDocs));
      setQuality(value(5, quality));
      setConnectorHealth(value(6, connectorHealth));
      setIngestionProgress(value(7, ingestionProgress));
      setPolicyChart(value(8, policyChart));
      setHeatmap(value(9, heatmap));
    } catch (err: any) {
      if (showError) {
        setError(err.message || "Failed to load admin dashboard");
      }
    }
  }

  async function runSync(name: "confluence" | "github" | "drive") {
    try {
      setSyncing(true);
      setSyncStatus(`Running ${name} sync...`);

      let result: any;

      if (name === "confluence") {
        result = await runConfluenceSync(ADMIN_USER_ID);
      } else if (name === "github") {
        result = await runGithubSync(ADMIN_USER_ID);
      } else {
        result = await runGoogleDriveSync(ADMIN_USER_ID);
      }

      setSyncStatus(
        `${name} sync finished: ingested=${result.ingested_count ?? 0}, skipped=${
          result.skipped_count ?? 0
        }, failed=${result.failed_count ?? 0}`
      );

      await loadDashboard(false);
    } catch (err: any) {
      setSyncStatus(`${name} sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadDashboard(true);
  }, []);

  const healthyConnectors = useMemo(
    () => connectorHealth.filter((c) => c.status === "healthy").length,
    [connectorHealth]
  );

  if (error) {
    return (
      <div style={errorPageStyle}>
        <h2>Admin dashboard error</h2>
        <p>{error}</p>
        <button onClick={() => loadDashboard(true)} style={primaryButtonStyle}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return <div style={loadingPageStyle}>Loading admin dashboard...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>DataTrust Governance Layer</div>
          <h1 style={titleStyle}>Admin Control Center</h1>
          <p style={subtitleStyle}>
            Monitor ingestion, authorization, connector health, policy violations, and
            retrieval data quality across enterprise knowledge sources.
          </p>
        </div>

        <div style={heroRightStyle}>
          <div style={statusPillStyle}>
            <span style={greenDotStyle} />
            {healthyConnectors}/{connectorHealth.length || 3} connectors healthy
          </div>
          <button onClick={() => loadDashboard(true)} style={primaryButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      <div style={syncBarStyle}>
        <div>
          <strong>Connector Sync Controls</strong>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
            Trigger ingestion from live enterprise sources.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => runSync("confluence")} disabled={syncing} style={buttonStyle}>
            Sync Confluence
          </button>
          <button onClick={() => runSync("github")} disabled={syncing} style={buttonStyle}>
            Sync GitHub
          </button>
          <button onClick={() => runSync("drive")} disabled={syncing} style={buttonStyle}>
            Sync Drive
          </button>
        </div>
      </div>

      {syncStatus && <div style={syncStatusStyle}>{syncStatus}</div>}

      <div style={metricGridStyle}>
        <MetricCard title="Documents" value={summary.total_documents} helper="Indexed sources" />
        <MetricCard title="Active Docs" value={summary.active_documents} helper="Available to RAG" />
        <MetricCard title="Chunks" value={summary.total_chunks} helper="Embedded text units" />
        <MetricCard title="Active Chunks" value={summary.active_chunks} helper="Retrievable chunks" />
        <MetricCard title="Users" value={summary.total_users} helper="Mapped identities" />
        <MetricCard title="Active Users" value={summary.active_users} helper="Enabled access" />
        <MetricCard title="Admins" value={summary.admin_users} helper="Governance users" />
        <MetricCard title="Data Quality" value={dataQualityLabel} helper="Validation status" tone="green" />
      </div>

      <div style={twoColStyle}>
        <Panel title="Connector Health" subtitle="GitHub, Confluence, and Google Drive status">
          <div style={{ display: "grid", gap: 12 }}>
            {connectorHealth.map((c) => (
              <ConnectorCard key={c.source} connector={c} />
            ))}
          </div>
        </Panel>

        <Panel title="Live Ingestion Progress" subtitle="Recent sync and indexing activity">
          <div style={progressGridStyle}>
            <ProgressTile label="Recent Docs" value={ingestionProgress?.total_recent_documents ?? 0} />
            <ProgressTile label="Updated" value={ingestionProgress?.active_or_updated ?? 0} />
            <ProgressTile label="No Change" value={ingestionProgress?.no_change ?? 0} />
            <ProgressTile label="Failed" value={ingestionProgress?.failed ?? 0} danger />
          </div>

          <div style={pipelineStyle}>
            <PipelineStep label="Fetch" />
            <PipelineStep label="Normalize" />
            <PipelineStep label="Chunk" />
            <PipelineStep label="Embed" />
            <PipelineStep label="Tag" />
            <PipelineStep label="Store" />
          </div>
        </Panel>
      </div>

      <div style={threeColStyle}>
        <ChartCard title="Documents by Source" data={bySource} />
        <ChartCard title="Documents by Department" data={byDepartment} />
        <ChartCard title="Chunks by Access Level" data={byLevel} />
      </div>

      <div style={twoColWideStyle}>
        <Panel title="Policy Violations Over Time" subtitle="Blocked or risky requests captured from audit logs">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={policyChart}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="violations"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="User Activity Heatmap" subtitle="Each cell is one day. Each row is one week.">
          <div style={heatmapGridStyle}>
            {heatmap.map((cell, idx) => (
              <div
                key={idx}
                title={`${cell.date} (${cell.day}) — ${cell.count} events`}
                style={{
                  height: 30,
                  borderRadius: 8,
                  background:
                    cell.count >= 12
                      ? "#1d4ed8"
                      : cell.count >= 6
                      ? "#2563eb"
                      : cell.count >= 1
                      ? "#60a5fa"
                      : "#1e293b",
                  opacity: cell.count > 0 ? 1 : 0.35,
                  border: "1px solid #334155",
                }}
              />
            ))}
          </div>

          <div style={legendStyle}>
            <span>Less</span>
            <span style={{ ...legendBoxStyle, background: "#1e293b", opacity: 0.4 }} />
            <span style={{ ...legendBoxStyle, background: "#60a5fa" }} />
            <span style={{ ...legendBoxStyle, background: "#2563eb" }} />
            <span style={{ ...legendBoxStyle, background: "#1d4ed8" }} />
            <span>More</span>
          </div>
        </Panel>
      </div>

      <Panel title="Recent Ingested Documents" subtitle="Latest indexed resources with department and access metadata">
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ color: "#93c5fd", textAlign: "left" }}>
                <th style={th}>Title</th>
                <th style={th}>Source</th>
                <th style={th}>Department</th>
                <th style={th}>Level</th>
                <th style={th}>Status</th>
                <th style={th}>Path</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.slice(0, 6).map((doc) => (
                <tr key={doc.id} style={{ borderTop: "1px solid #1e293b" }}>
                  <td style={td}>{doc.title}</td>
                  <td style={td}>{doc.source_systems?.code || "-"}</td>
                  <td style={td}>{doc.departments?.code || "-"}</td>
                  <td style={td}>{doc.auth_levels?.code || "-"}</td>
                  <td style={td}>
                    <span style={smallGreenPillStyle}>{doc.sync_status || "active"}</span>
                  </td>
                  <td style={{ ...td, color: "#94a3b8" }}>{doc.resource_path || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div style={qualityPanelStyle(quality?.status === "healthy")}>
        <div>
          <h2 style={{ margin: 0 }}>Data Quality</h2>
          <p style={{ color: "#cbd5e1", marginBottom: 0 }}>
            Validates indexed chunks, source paths, and retrievable content state.
          </p>
        </div>

        <div style={qualityStatsStyle}>
          <ProgressTile label="Local Path Issues" value={quality?.local_path_issues ?? 0} />
          <ProgressTile label="Empty Chunks" value={quality?.empty_chunks ?? 0} />
          <ProgressTile label="Inactive Chunks" value={quality?.inactive_chunks ?? 0} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  tone = "blue",
}: {
  title: string;
  value: any;
  helper: string;
  tone?: "blue" | "green";
}) {
  return (
    <div style={metricCardStyle}>
      <div style={{ color: "#94a3b8", fontSize: 13 }}>{title}</div>
      <div
        style={{
          fontSize: typeof value === "string" ? 23 : 32,
          fontWeight: 900,
          marginTop: 8,
          color: tone === "green" ? "#86efac" : "#f8fafc",
          textTransform: typeof value === "string" ? "capitalize" : "none",
        }}
      >
        {value}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{helper}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
        {subtitle && <p style={{ color: "#94a3b8", margin: "6px 0 0", fontSize: 13 }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ConnectorCard({ connector }: { connector: ConnectorHealth }) {
  const healthy = connector.status === "healthy";

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: healthy ? "1px solid #166534" : "1px solid #7f1d1d",
        background: healthy
          ? "linear-gradient(135deg, #052e16, #0f172a)"
          : "linear-gradient(135deg, #3f1d1d, #0f172a)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <strong>{connector.source}</strong>
        <span style={healthy ? greenPillStyle : redPillStyle}>{connector.status}</span>
      </div>
      <div style={{ color: "#cbd5e1", marginTop: 8, fontSize: 13 }}>
        Documents: {connector.document_count} | Failures: {connector.failure_count}
      </div>
      <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 12 }}>
        Last sync: {connector.last_sync_at || "Not synced yet"}
      </div>
    </div>
  );
}

function ProgressTile({ label, value, danger = false }: { label: string; value: any; danger?: boolean }) {
  return (
    <div style={progressTileStyle}>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6, color: danger ? "#fca5a5" : "#f8fafc" }}>
        {value}
      </div>
    </div>
  );
}

function PipelineStep({ label }: { label: string }) {
  return (
    <div style={pipelineStepStyle}>
      {label}
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: ChartRow[] }) {
  return (
    <section style={chartCardStyle}>
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, #1e3a8a 0%, #020617 36%, #030712 100%)",
  color: "white",
  padding: 28,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const heroStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "flex-start",
  marginBottom: 20,
};

const heroRightStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 38,
  margin: 0,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const subtitleStyle: React.CSSProperties = {
  color: "#cbd5e1",
  maxWidth: 860,
  lineHeight: 1.6,
  marginTop: 10,
};

const metricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const metricCardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.92))",
  border: "1px solid #1e293b",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  marginBottom: 22,
};

const threeColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 18,
  marginBottom: 22,
};

const twoColWideStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: 18,
  marginBottom: 22,
};

const panelStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid #1e293b",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
};

const chartCardStyle: React.CSSProperties = {
  height: 300,
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid #1e293b",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
};

const syncBarStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.78)",
  border: "1px solid #1e293b",
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
};

const syncStatusStyle: React.CSSProperties = {
  background: "#082f49",
  border: "1px solid #0369a1",
  color: "#bae6fd",
  borderRadius: 14,
  padding: 12,
  marginBottom: 16,
};

const buttonStyle: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid #2563eb",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid #166534",
  background: "#052e16",
  color: "#bbf7d0",
  borderRadius: 999,
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 800,
};

const greenDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#22c55e",
};

const progressGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};

const progressTileStyle: React.CSSProperties = {
  background: "#0b1220",
  border: "1px solid #243041",
  borderRadius: 16,
  padding: 14,
};

const pipelineStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: 8,
  marginTop: 18,
};

const pipelineStepStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid #1d4ed8",
  background: "#10203a",
  color: "#bfdbfe",
  textAlign: "center",
  fontSize: 12,
  fontWeight: 800,
  padding: "8px 6px",
};

const heatmapGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginTop: 12,
};

const legendStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#94a3b8",
  fontSize: 12,
  marginTop: 14,
};

const legendBoxStyle: React.CSSProperties = {
  width: 18,
  height: 12,
  borderRadius: 4,
  display: "inline-block",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  color: "#e5e7eb",
};

const th: React.CSSProperties = {
  padding: "11px 10px",
  fontSize: 13,
  borderBottom: "1px solid #334155",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "11px 10px",
  fontSize: 13,
  color: "#cbd5e1",
  verticalAlign: "top",
};

const greenPillStyle: React.CSSProperties = {
  borderRadius: 999,
  background: "#14532d",
  color: "#bbf7d0",
  padding: "4px 9px",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "capitalize",
};

const redPillStyle: React.CSSProperties = {
  borderRadius: 999,
  background: "#7f1d1d",
  color: "#fecaca",
  padding: "4px 9px",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "capitalize",
};

const smallGreenPillStyle: React.CSSProperties = {
  borderRadius: 999,
  background: "#052e16",
  color: "#86efac",
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 800,
};

const tooltipStyle: React.CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  color: "#e5e7eb",
};

const qualityStatsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  minWidth: 420,
};

function qualityPanelStyle(healthy: boolean): React.CSSProperties {
  return {
    ...panelStyle,
    background: healthy
      ? "linear-gradient(135deg, #052e16, #0f172a)"
      : "linear-gradient(135deg, #3f1d1d, #0f172a)",
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
  };
}

const loadingPageStyle: React.CSSProperties = {
  padding: 40,
  color: "white",
  background: "#020617",
  minHeight: "100vh",
};

const errorPageStyle: React.CSSProperties = {
  padding: 40,
  color: "#fecaca",
  background: "#020617",
  minHeight: "100vh",
};
// import { useEffect, useState } from "react";
// import {
//   BarChart,
//   Bar,
//   LineChart,
//   Line,
//   CartesianGrid,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";

// import {
//   getAdminSummary,
//   getDocumentsBySource,
//   getDocumentsByDepartment,
//   getChunksByLevel,
//   getRecentDocuments,
//   getDataQuality,
//   getConnectorHealth,
//   getIngestionProgress,
//   getPolicyViolationsChart,
//   getUserActivityHeatmap,
//   runConfluenceSync,
//   runGithubSync,
//   runGoogleDriveSync,
// } from "../services/api";

// const ADMIN_USER_ID = "e483f8b4-1529-4a2a-a2ae-7922f4d0157a";

// const panelStyle: React.CSSProperties = {
//   background: "#0f172a",
//   border: "1px solid #1e293b",
//   borderRadius: 18,
//   padding: 18,
//   color: "white",
// };
// const buttonStyle: React.CSSProperties = {
//   height: 44,
//   padding: "0 16px",
//   borderRadius: 12,
//   border: "1px solid #2563eb",
//   background: "#1d4ed8",
//   color: "white",
//   fontWeight: 800,
//   cursor: "pointer",
// };

// function Card({ title, value }: { title: string; value: any }) {
//   return (
//     <div style={panelStyle}>
//       <div style={{ color: "#94a3b8", fontSize: 13 }}>{title}</div>
//       <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>{value}</div>
//     </div>
//   );
// }

// function ChartCard({ title, data }: { title: string; data: any[] }) {
//   return (
//     <div style={{ ...panelStyle, height: 300 }}>
//       <h3 style={{ marginTop: 0 }}>{title}</h3>
//       <ResponsiveContainer width="100%" height={220}>
//         <BarChart data={data}>
//           <XAxis dataKey="name" stroke="#94a3b8" />
//           <YAxis stroke="#94a3b8" />
//           <Tooltip />
//           <Bar dataKey="value" fill="#3b82f6" />
//         </BarChart>
//       </ResponsiveContainer>
//     </div>
//   );
// }

// export default function AdminDashboardPage() {
//   const [summary, setSummary] = useState<any>(null);
//   const [bySource, setBySource] = useState<any[]>([]);
//   const [byDepartment, setByDepartment] = useState<any[]>([]);
//   const [byLevel, setByLevel] = useState<any[]>([]);
//   const [recentDocs, setRecentDocs] = useState<any[]>([]);
//   const [quality, setQuality] = useState<any>(null);
//   const [connectorHealth, setConnectorHealth] = useState<any[]>([]);
//   const [ingestionProgress, setIngestionProgress] = useState<any>(null);
//   const [policyChart, setPolicyChart] = useState<any[]>([]);
//   const [heatmap, setHeatmap] = useState<any[]>([]);
//   const [error, setError] = useState("");
//   const [syncStatus, setSyncStatus] = useState("");
//   const [syncing, setSyncing] = useState(false);

//   {syncStatus && (
//   <div
//     style={{
//       marginBottom: 18,
//       padding: 14,
//       borderRadius: 14,
//       background: syncStatus.includes("failed") ? "#3f1d1d" : "#052e16",
//       border: "1px solid #334155",
//       color: "#e5e7eb",
//     }}
//   >
//     {syncStatus}
//   </div>
// )}

//   async function loadDashboard(showError = true) {
//     try {
//       setError("");

//     //   const [
//     //     summaryData,
//     //     sourceData,
//     //     deptData,
//     //     levelData,
//     //     recentData,
//     //     qualityData,
//     //     connectorHealthData,
//     //     ingestionProgressData,
//     //     policyChartData,
//     //     heatmapData,
//     // ] = await Promise.all([
//     //     getAdminSummary(ADMIN_USER_ID),
//     //     getDocumentsBySource(ADMIN_USER_ID),
//     //     getDocumentsByDepartment(ADMIN_USER_ID),
//     //     getChunksByLevel(ADMIN_USER_ID),
//     //     getRecentDocuments(ADMIN_USER_ID),
//     //     getDataQuality(ADMIN_USER_ID),
//     //     getConnectorHealth(ADMIN_USER_ID),
//     //     getIngestionProgress(ADMIN_USER_ID),
//     //     getPolicyViolationsChart(ADMIN_USER_ID),
//     //     getUserActivityHeatmap(ADMIN_USER_ID),
//     //   ]);

//     //   setSummary(summaryData);
//     //   setBySource(sourceData);
//     //   setByDepartment(deptData);
//     //   setByLevel(levelData);
//     //   setRecentDocs(recentData);
//     //   setQuality(qualityData);
//     //   setConnectorHealth(connectorHealthData);
//     //   setIngestionProgress(ingestionProgressData);
//     //   setPolicyChart(policyChartData);
//     //   setHeatmap(heatmapData);
//     const results = await Promise.allSettled([
//   getAdminSummary(ADMIN_USER_ID),
//   getDocumentsBySource(ADMIN_USER_ID),
//   getDocumentsByDepartment(ADMIN_USER_ID),
//   getChunksByLevel(ADMIN_USER_ID),
//   getRecentDocuments(ADMIN_USER_ID),
//   getDataQuality(ADMIN_USER_ID),
//   getConnectorHealth(ADMIN_USER_ID),
//   getIngestionProgress(ADMIN_USER_ID),
//   getPolicyViolationsChart(ADMIN_USER_ID),
//   getUserActivityHeatmap(ADMIN_USER_ID),
// ]);

// const value = (i: number, fallback: any) =>
//   results[i].status === "fulfilled" ? results[i].value : fallback;

// setSummary(value(0, summary));
// setBySource(value(1, bySource));
// setByDepartment(value(2, byDepartment));
// setByLevel(value(3, byLevel));
// setRecentDocs(value(4, recentDocs));
// setQuality(value(5, quality));
// setConnectorHealth(value(6, connectorHealth));
// setIngestionProgress(value(7, ingestionProgress));
// setPolicyChart(value(8, policyChart));
// setHeatmap(value(9, heatmap));
//     }catch (err: any) {
//       if (showError) {
//       setError(err.message || "Failed to load admin dashboard");
//   }
// }
//   }

//   async function runSync(name: "confluence" | "github" | "drive") {
//   try {
//     setSyncing(true);
//     setSyncStatus(`Running ${name} sync...`);

//     let result;

//     if (name === "confluence") {
//       result = await runConfluenceSync(ADMIN_USER_ID);
//     } else if (name === "github") {
//       result = await runGithubSync(ADMIN_USER_ID);
//     } else {
//       result = await runGoogleDriveSync(ADMIN_USER_ID);
//     }

//     setSyncStatus(
//       `${name} sync finished: ingested=${result.ingested_count}, skipped=${result.skipped_count}, failed=${result.failed_count ?? 0}`
//     );

//     await loadDashboard();
//   } catch (err: any) {
//     setSyncStatus(`${name} sync failed: ${err.message}`);
//   } finally {
//     setSyncing(false);
//   }
// }

//   useEffect(() => {
//   let stopped = false;
//   let running = false;

//   async function poll() {
//     if (stopped || running) return;

//     running = true;
//     try {
//       await loadDashboard(true);
//     } finally {
//       running = false;
//     }
//   }

//   poll();

//   //const interval = window.setInterval(poll, 50000);

//   return () => {
//     stopped = true;
//     //window.clearInterval(interval);
//   };
// }, []);

//   if (error) {
//     return (
//       <div style={{ padding: 40, color: "#fecaca", background: "#020617", minHeight: "100vh" }}>
//         {error}
//       </div>
//     );
//   }

//   if (!summary) {
//     return (
//       <div style={{ padding: 40, color: "white", background: "#020617", minHeight: "100vh" }}>
//         Loading admin dashboard...
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "radial-gradient(circle at top left, #1e3a8a, #020617 35%)",
//         color: "white",
//         padding: 28,
//       }}
//     >
//       <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between" }}>
//         <div>
//           <h1 style={{ fontSize: 34, margin: 0 }}>DataTrust Admin Control Center</h1>
//           <p style={{ color: "#94a3b8" }}>
//             Ingestion, authorization, retrieval, policy, connector, and data-quality monitoring.
//           </p>
//         </div>

//         <button
//           onClick={() => loadDashboard(true)}
//           style={{
//             height: 44,
//             padding: "0 18px",
//             borderRadius: 12,
//             border: "1px solid #2563eb",
//             background: "#1d4ed8",
//             color: "white",
//             fontWeight: 800,
//             cursor: "pointer",
//           }}
//         >
//           Refresh
//         </button>
//       </div>

//           <div style={{ display: "flex", gap: 10 }}>
//   <button onClick={() => runSync("confluence")} disabled={syncing} style={buttonStyle}>
//     Sync Confluence
//   </button>
//   <button onClick={() => runSync("github")} disabled={syncing} style={buttonStyle}>
//     Sync GitHub
//   </button>
//   <button onClick={() => runSync("drive")} disabled={syncing} style={buttonStyle}>
//     Sync Drive
//   </button>
//   <button onClick={() => loadDashboard(true)} style={buttonStyle}>
//   Refresh
// </button>
// </div>
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
//         <Card title="Documents" value={summary.total_documents} />
//         <Card title="Active Documents" value={summary.active_documents} />
//         <Card title="Chunks" value={summary.total_chunks} />
//         <Card title="Active Chunks" value={summary.active_chunks} />
//         <Card title="Users" value={summary.total_users} />
//         <Card title="Active Users" value={summary.active_users} />
//         <Card title="Admins" value={summary.admin_users} />
//         <Card title="Data Quality" value={quality?.status || "unknown"} />
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
//         <div style={panelStyle}>
//           <h2 style={{ marginTop: 0 }}>Connector Health</h2>
//           {connectorHealth.map((c) => (
//             <div
//               key={c.source}
//               style={{
//                 padding: 12,
//                 borderRadius: 14,
//                 border: "1px solid #243041",
//                 marginBottom: 10,
//                 background: c.status === "healthy" ? "#052e16" : "#3f1d1d",
//               }}
//             >
//               <strong>{c.source}</strong> — {c.status}
//               <div style={{ color: "#cbd5e1", marginTop: 4 }}>
//                 Documents: {c.document_count} | Failures: {c.failure_count}
//               </div>
//               <div style={{ color: "#94a3b8", fontSize: 12 }}>
//                 Last sync: {c.last_sync_at || "Not synced yet"}
//               </div>
//             </div>
//           ))}
//         </div>

//         <div style={panelStyle}>
//           <h2 style={{ marginTop: 0 }}>Live Ingestion Progress</h2>
//           <p>Total recent docs: {ingestionProgress?.total_recent_documents ?? 0}</p>
//           <p>Active/updated: {ingestionProgress?.active_or_updated ?? 0}</p>
//           <p>No change: {ingestionProgress?.no_change ?? 0}</p>
//           <p>Failed: {ingestionProgress?.failed ?? 0}</p>
//         </div>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 24 }}>
//         <ChartCard title="Documents by Source" data={bySource} />
//         <ChartCard title="Documents by Department" data={byDepartment} />
//         <ChartCard title="Chunks by Access Level" data={byLevel} />
//       </div>

//       <div style={{ ...panelStyle, marginBottom: 24, height: 340 }}>
//         <h2 style={{ marginTop: 0 }}>Policy Violations Over Time</h2>
//         <ResponsiveContainer width="100%" height={250}>
//           <LineChart data={policyChart}>
//             <CartesianGrid stroke="#1e293b" />
//             <XAxis dataKey="date" stroke="#94a3b8" />
//             <YAxis stroke="#94a3b8" />
//             <Tooltip />
//             <Line type="monotone" dataKey="violations" stroke="#ef4444" strokeWidth={3} />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>

//      <div style={{ ...panelStyle, marginBottom: 24 }}>
//   <h2 style={{ marginTop: 0 }}>User Activity Heatmap — Last 6 Weeks</h2>

//   <div
//     style={{
//       display: "grid",
//       gridTemplateColumns: "repeat(7, 1fr)",
//       gap: 6,
//       marginTop: 14,
//       maxWidth: 720,
//     }}
//   >
//     {heatmap.map((cell, idx) => (
//       <div
//         key={idx}
//         title={`${cell.date} (${cell.day}) — ${cell.count} events`}
//         style={{
//           height: 34,
//           borderRadius: 8,
//           background:
//             cell.count >= 12
//               ? "#1d4ed8"
//               : cell.count >= 6
//               ? "#2563eb"
//               : cell.count >= 1
//               ? "#60a5fa"
//               : "#1e293b",
//           opacity: cell.count > 0 ? 1 : 0.35,
//           border: "1px solid #334155",
//         }}
//       />
//     ))}
//   </div>

//   <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 12 }}>
//     Each cell is one day. Each row is one week.
//   </div>
// </div>

//       <div style={{ ...panelStyle, marginBottom: 24 }}>
//         <h2 style={{ marginTop: 0 }}>Recent Ingested Documents</h2>
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse", color: "#e5e7eb" }}>
//             <thead>
//               <tr style={{ color: "#93c5fd", textAlign: "left" }}>
//                 <th style={th}>Title</th>
//                 <th style={th}>Source</th>
//                 <th style={th}>Department</th>
//                 <th style={th}>Level</th>
//                 <th style={th}>Status</th>
//                 <th style={th}>Path</th>
//               </tr>
//             </thead>
//             <tbody>
//               {recentDocs.map((doc) => (
//                 <tr key={doc.id} style={{ borderTop: "1px solid #1e293b" }}>
//                   <td style={td}>{doc.title}</td>
//                   <td style={td}>{doc.source_systems?.code}</td>
//                   <td style={td}>{doc.departments?.code}</td>
//                   <td style={td}>{doc.auth_levels?.code}</td>
//                   <td style={td}>{doc.sync_status}</td>
//                   <td style={td}>{doc.resource_path}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       <div
//         style={{
//           ...panelStyle,
//           background: quality?.status === "healthy" ? "#052e16" : "#3f1d1d",
//         }}
//       >
//         <h2 style={{ marginTop: 0 }}>Data Quality</h2>
//         <p>Local path issues: {quality?.local_path_issues}</p>
//         <p>Empty chunks: {quality?.empty_chunks}</p>
//         <p>Inactive chunks: {quality?.inactive_chunks}</p>
//       </div>
//     </div>
//   );
// }

// const th: React.CSSProperties = {
//   padding: "10px",
//   fontSize: 13,
//   borderBottom: "1px solid #334155",
// };

// const td: React.CSSProperties = {
//   padding: "10px",
//   fontSize: 13,
//   color: "#cbd5e1",
// };