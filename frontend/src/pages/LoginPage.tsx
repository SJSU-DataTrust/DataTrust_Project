import { useAuth0 } from "@auth0/auth0-react";

export default function LoginPage() {
  const { loginWithRedirect, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top left, #172554, #020617 40%)",
      color: "white",
      display: "grid",
      placeItems: "center",
    }}>
      <div style={{
        width: 420,
        padding: 32,
        borderRadius: 24,
        background: "#0f172a",
        border: "1px solid #334155",
      }}>
        <h1>DataTrust</h1>
        <p style={{ color: "#94a3b8" }}>Secure enterprise knowledge access</p>

        <button
          onClick={() => loginWithRedirect()}
          style={button}
        >
          Continue with Auth0
        </button>

        <button
          onClick={() =>
            loginWithRedirect({
              authorizationParams: { connection: "google-oauth2" },
            })
          }
          style={button}
        >
          Continue with Google
        </button>

        <button
          onClick={() =>
            loginWithRedirect({
              authorizationParams: { connection: "github" },
            })
          }
          style={button}
        >
          Continue with GitHub
        </button>

        <p style={{ color: "#64748b", fontSize: 12 }}>
          Backend authorization is still enforced by DataTrust policies.
        </p>
      </div>
    </div>
  );
}

const button: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  marginTop: 12,
  borderRadius: 14,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};