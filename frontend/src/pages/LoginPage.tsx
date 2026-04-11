import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

// Original LoginPage kept for reference
// type Props = { onLogin: (email: string) => void; };
// export default function LoginPage({ onLogin }: Props) { ... }

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#020617", color: "#94a3b8"
      }}>
        Loading...
      </div>
    );
  }

  // Original manual submit — kept but wired to nothing until backend ready
  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) return;
    // onLogin(email); ← original call, backend not connected yet
    console.log("Manual login not connected to backend yet");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at top left, #172554 0%, #020617 35%, #030712 100%)",
      color: "white",
    }}>
      <div style={{
        width: "400px",
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔐</div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#f8fafc" }}>
            DataTrust
          </h2>
          <p style={{ margin: "0.3rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Enterprise Knowledge Access Platform
          </p>
        </div>

        {/* Auth0 SSO */}
        <button
          onClick={() => loginWithRedirect()}
          style={btnStyle("#635DFF", "0 4px 15px rgba(99,93,255,0.4)")}
        >
          <Auth0Icon /> Continue with Auth0
        </button>

        {/* Google */}
        <button
          onClick={() => loginWithRedirect({ authorizationParams: { connection: "google-oauth2" }})}
          style={{...btnStyle("white", "0 1px 3px rgba(0,0,0,0.1)"),
            color: "#374151", border: "1px solid #d1d5db"}}
        >
          <GoogleIcon /> Continue with Google
        </button>

        {/* GitHub */}
        <button
          onClick={() => loginWithRedirect({ authorizationParams: { connection: "github" }})}
          style={btnStyle("#24292e", "none")}
        >
          <GitHubIcon /> Continue with GitHub
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#1e293b" }} />
          <span style={{ color: "#475569", fontSize: "0.8rem" }}>or sign in manually</span>
          <div style={{ flex: 1, height: "1px", background: "#1e293b" }} />
        </div>

        {/* Original manual form — kept, backend not connected yet */}
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="you@company.com"
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>

        <button onClick={handleSubmit} style={btnStyle("#0d9488", "none")}>
          Sign In
        </button>

        <p style={{ textAlign: "center", color: "#475569", fontSize: "0.78rem", marginTop: "1.2rem" }}>
          Protected by Auth0 · Role-based access enforced
        </p>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────
function btnStyle(bg: string, shadow: string): React.CSSProperties {
  return {
    width: "100%", padding: "0.85rem",
    background: bg, border: "none", borderRadius: "12px",
    fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "0.6rem", marginBottom: "0.75rem",
    color: "white", boxShadow: shadow,
  };
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.85rem",
  fontWeight: 600, color: "#94a3b8", marginBottom: "0.4rem"
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.75rem 1rem",
  borderRadius: "10px", border: "1px solid #334155",
  background: "#1e293b", color: "#f8fafc",
  fontSize: "0.95rem", outline: "none",
  boxSizing: "border-box"
};

// ── SVG Icons ────────────────────────────────────────────
function Auth0Icon() {
  return (
    <svg width="18" height="18" viewBox="0 0 64 64" fill="white">
      <path d="M32 0C14.327 0 0 14.327 0 32s14.327 32 32 32 32-14.327 32-32S49.673 0 32 0zm0 11.636l10.327 31.782H21.673L32 11.636zm-20.945 20L21.818 63.27C9.891 59.345 1.455 48.218 1.455 35.055c0-1.309.109-2.618.218-3.927l9.382.508zm41.89 0l9.382-.508c.109 1.309.218 2.618.218 3.927 0 13.163-8.436 24.29-20.364 28.215l10.764-31.634z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}