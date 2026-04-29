import { useState } from "react";
import { login } from "../services/api";

type Props = {
  onLogin: (userId: string) => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setError("");
    setLoading(true);
    try {
      const userId = await login(email.trim(), password);
      onLogin(userId);
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617",
        color: "white",
      }}
    >
      <div
        style={{
          width: "380px",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Sign in to DataTrust</h2>

        <div style={{ marginBottom: "12px" }}>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              borderRadius: "10px",
              border: "1px solid #475569",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              borderRadius: "10px",
              border: "1px solid #475569",
            }}
          />
        </div>

        {error && (
          <p style={{ color: "#f87171", marginBottom: "12px", fontSize: "14px" }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #334155",
            background: loading ? "#1d4ed8" : "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </div>
  );
}