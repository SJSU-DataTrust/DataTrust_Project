import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div style={{ padding: 40, color: "white", background: "#020617", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const email = user?.email?.toLowerCase();

  if (email !== "admin@borcella.com") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}