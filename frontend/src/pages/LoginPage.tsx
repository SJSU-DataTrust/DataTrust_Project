import { useState } from "react";

type Props = {
  onLogin: (email: string) => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) return;
    onLogin(email);
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

        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #334155",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}