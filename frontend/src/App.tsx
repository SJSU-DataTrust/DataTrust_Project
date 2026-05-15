import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import ChatPage from "./pages/ChatPage";
import DemoChatPage from "./pages/DemoChatPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LoginPage from "./pages/LoginPage";
import CallbackPage from "./pages/CallbackPage";
import AdminRoute from "./components/AdminRoute";

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020617", color: "white", display: "grid", placeItems: "center" }}>
        Authenticating...
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      <Route
        path="/"
        element={
          <Protected>
            <ChatPage />
          </Protected>
        }
      />

      <Route path="/demo" element={<DemoChatPage />} />

      {/* <Route path="/admin" element={<AdminDashboardPage />} /> */}

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import ChatPage from "./pages/ChatPage";
// import AdminDashboardPage from "./pages/AdminDashboardPage";

// export default function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<ChatPage />} />
//         <Route path="/admin" element={<AdminDashboardPage />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

