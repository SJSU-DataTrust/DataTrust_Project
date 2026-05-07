import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

const panelStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 18,
  padding: 18,
  color: "white",
};
const buttonStyle: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #2563eb",
  background: "#1d4ed8",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div style={panelStyle}>
      <div style={{ color: "#94a3b8", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: any[] }) {
  return (
    <div style={{ ...panelStyle, height: 300 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [bySource, setBySource] = useState<any[]>([]);
  const [byDepartment, setByDepartment] = useState<any[]>([]);
  const [byLevel, setByLevel] = useState<any[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [quality, setQuality] = useState<any>(null);
  const [connectorHealth, setConnectorHealth] = useState<any[]>([]);
  const [ingestionProgress, setIngestionProgress] = useState<any>(null);
  const [policyChart, setPolicyChart] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [syncing, setSyncing] = useState(false);

  {syncStatus && (
  <div
    style={{
      marginBottom: 18,
      padding: 14,
      borderRadius: 14,
      background: syncStatus.includes("failed") ? "#3f1d1d" : "#052e16",
      border: "1px solid #334155",
      color: "#e5e7eb",
    }}
  >
    {syncStatus}
  </div>
)}

  async function loadDashboard(showError = true) {
    try {
      setError("");

    //   const [
    //     summaryData,
    //     sourceData,
    //     deptData,
    //     levelData,
    //     recentData,
    //     qualityData,
    //     connectorHealthData,
    //     ingestionProgressData,
    //     policyChartData,
    //     heatmapData,
    // ] = await Promise.all([
    //     getAdminSummary(ADMIN_USER_ID),
    //     getDocumentsBySource(ADMIN_USER_ID),
    //     getDocumentsByDepartment(ADMIN_USER_ID),
    //     getChunksByLevel(ADMIN_USER_ID),
    //     getRecentDocuments(ADMIN_USER_ID),
    //     getDataQuality(ADMIN_USER_ID),
    //     getConnectorHealth(ADMIN_USER_ID),
    //     getIngestionProgress(ADMIN_USER_ID),
    //     getPolicyViolationsChart(ADMIN_USER_ID),
    //     getUserActivityHeatmap(ADMIN_USER_ID),
    //   ]);

    //   setSummary(summaryData);
    //   setBySource(sourceData);
    //   setByDepartment(deptData);
    //   setByLevel(levelData);
    //   setRecentDocs(recentData);
    //   setQuality(qualityData);
    //   setConnectorHealth(connectorHealthData);
    //   setIngestionProgress(ingestionProgressData);
    //   setPolicyChart(policyChartData);
    //   setHeatmap(heatmapData);
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

const value = (i: number, fallback: any) =>
  results[i].status === "fulfilled" ? results[i].value : fallback;

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
    }catch (err: any) {
      if (showError) {
      setError(err.message || "Failed to load admin dashboard");
  }
}
  }

  async function runSync(name: "confluence" | "github" | "drive") {
  try {
    setSyncing(true);
    setSyncStatus(`Running ${name} sync...`);

    let result;

    if (name === "confluence") {
      result = await runConfluenceSync(ADMIN_USER_ID);
    } else if (name === "github") {
      result = await runGithubSync(ADMIN_USER_ID);
    } else {
      result = await runGoogleDriveSync(ADMIN_USER_ID);
    }

    setSyncStatus(
      `${name} sync finished: ingested=${result.ingested_count}, skipped=${result.skipped_count}, failed=${result.failed_count ?? 0}`
    );

    await loadDashboard();
  } catch (err: any) {
    setSyncStatus(`${name} sync failed: ${err.message}`);
  } finally {
    setSyncing(false);
  }
}

  useEffect(() => {
  let stopped = false;
  let running = false;

  async function poll() {
    if (stopped || running) return;

    running = true;
    try {
      await loadDashboard(true);
    } finally {
      running = false;
    }
  }

  poll();

  //const interval = window.setInterval(poll, 50000);

  return () => {
    stopped = true;
    //window.clearInterval(interval);
  };
}, []);

  if (error) {
    return (
      <div style={{ padding: 40, color: "#fecaca", background: "#020617", minHeight: "100vh" }}>
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ padding: 40, color: "white", background: "#020617", minHeight: "100vh" }}>
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left, #1e3a8a, #020617 35%)",
        color: "white",
        padding: 28,
      }}
    >
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 34, margin: 0 }}>DataTrust Admin Control Center</h1>
          <p style={{ color: "#94a3b8" }}>
            Ingestion, authorization, retrieval, policy, connector, and data-quality monitoring.
          </p>
        </div>

        <button
          onClick={() => loadDashboard(true)}
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 12,
            border: "1px solid #2563eb",
            background: "#1d4ed8",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

          <div style={{ display: "flex", gap: 10 }}>
  <button onClick={() => runSync("confluence")} disabled={syncing} style={buttonStyle}>
    Sync Confluence
  </button>
  <button onClick={() => runSync("github")} disabled={syncing} style={buttonStyle}>
    Sync GitHub
  </button>
  <button onClick={() => runSync("drive")} disabled={syncing} style={buttonStyle}>
    Sync Drive
  </button>
  <button onClick={() => loadDashboard(true)} style={buttonStyle}>
  Refresh
</button>
</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card title="Documents" value={summary.total_documents} />
        <Card title="Active Documents" value={summary.active_documents} />
        <Card title="Chunks" value={summary.total_chunks} />
        <Card title="Active Chunks" value={summary.active_chunks} />
        <Card title="Users" value={summary.total_users} />
        <Card title="Active Users" value={summary.active_users} />
        <Card title="Admins" value={summary.admin_users} />
        <Card title="Data Quality" value={quality?.status || "unknown"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
        <div style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Connector Health</h2>
          {connectorHealth.map((c) => (
            <div
              key={c.source}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid #243041",
                marginBottom: 10,
                background: c.status === "healthy" ? "#052e16" : "#3f1d1d",
              }}
            >
              <strong>{c.source}</strong> — {c.status}
              <div style={{ color: "#cbd5e1", marginTop: 4 }}>
                Documents: {c.document_count} | Failures: {c.failure_count}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>
                Last sync: {c.last_sync_at || "Not synced yet"}
              </div>
            </div>
          ))}
        </div>

        <div style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Live Ingestion Progress</h2>
          <p>Total recent docs: {ingestionProgress?.total_recent_documents ?? 0}</p>
          <p>Active/updated: {ingestionProgress?.active_or_updated ?? 0}</p>
          <p>No change: {ingestionProgress?.no_change ?? 0}</p>
          <p>Failed: {ingestionProgress?.failed ?? 0}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 24 }}>
        <ChartCard title="Documents by Source" data={bySource} />
        <ChartCard title="Documents by Department" data={byDepartment} />
        <ChartCard title="Chunks by Access Level" data={byLevel} />
      </div>

      <div style={{ ...panelStyle, marginBottom: 24, height: 340 }}>
        <h2 style={{ marginTop: 0 }}>Policy Violations Over Time</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={policyChart}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Line type="monotone" dataKey="violations" stroke="#ef4444" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

     <div style={{ ...panelStyle, marginBottom: 24 }}>
  <h2 style={{ marginTop: 0 }}>User Activity Heatmap — Last 6 Weeks</h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 6,
      marginTop: 14,
      maxWidth: 720,
    }}
  >
    {heatmap.map((cell, idx) => (
      <div
        key={idx}
        title={`${cell.date} (${cell.day}) — ${cell.count} events`}
        style={{
          height: 34,
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

  <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 12 }}>
    Each cell is one day. Each row is one week.
  </div>
</div>

      <div style={{ ...panelStyle, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Recent Ingested Documents</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#e5e7eb" }}>
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
              {recentDocs.map((doc) => (
                <tr key={doc.id} style={{ borderTop: "1px solid #1e293b" }}>
                  <td style={td}>{doc.title}</td>
                  <td style={td}>{doc.source_systems?.code}</td>
                  <td style={td}>{doc.departments?.code}</td>
                  <td style={td}>{doc.auth_levels?.code}</td>
                  <td style={td}>{doc.sync_status}</td>
                  <td style={td}>{doc.resource_path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          ...panelStyle,
          background: quality?.status === "healthy" ? "#052e16" : "#3f1d1d",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Data Quality</h2>
        <p>Local path issues: {quality?.local_path_issues}</p>
        <p>Empty chunks: {quality?.empty_chunks}</p>
        <p>Inactive chunks: {quality?.inactive_chunks}</p>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px",
  fontSize: 13,
  borderBottom: "1px solid #334155",
};

const td: React.CSSProperties = {
  padding: "10px",
  fontSize: 13,
  color: "#cbd5e1",
};