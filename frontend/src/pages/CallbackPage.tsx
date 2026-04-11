import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/auth";

export default function CallbackPage() {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      // Save user sub so api.ts can use it if needed later
      auth.save(user.sub ?? "");
      navigate("/", { replace: true });
    } else if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, user]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#020617", gap: "1rem"
    }}>
      <div style={{ fontSize: "2rem" }}>🔐</div>
      <p style={{ color: "#64748b", fontSize: "1rem" }}>
        Completing sign in...
      </p>
    </div>
  );
}