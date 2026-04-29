import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const adminUserId = "e483f8b4-1529-4a2a-a2ae-7922f4d0157a";
  const [userId, setUserId] = useState<string | null>(null);

  if (!userId) {
    return <LoginPage onLogin={setUserId} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage userId={userId} />} />
        <Route path="/admin" element={<AdminDashboardPage adminUserId={adminUserId} />} />
      </Routes>
    </BrowserRouter>
  );
}