import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import ChatPage from "./pages/ChatPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LoginPage from "./pages/LoginPage";
import CallbackPage from "./pages/CallbackPage";

const adminUserId = "e483f8b4-1529-4a2a-a2ae-7922f4d0157a";

// Protects routes — waits for Auth0, redirects if not logged in
function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#020617", color: "#94a3b8", fontSize: "1rem"
      }}>
        Authenticating...
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  // Original App.tsx routes — kept for reference
  // <Route path="/" element={<ChatPage />} />
  // <Route path="/admin" element={<AdminDashboardPage adminUserId={adminUserId} />} />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <ChatPage />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminDashboardPage adminUserId={adminUserId} />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}