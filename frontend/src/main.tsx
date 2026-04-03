import React from "react";
import ReactDOM from "react-dom/client";
import ChatPage from "./pages/ChatPage";
import './index.css'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChatPage />
  </React.StrictMode>
);