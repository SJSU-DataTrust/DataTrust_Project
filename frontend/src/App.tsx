import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import ChatPage from "./pages/ChatPage";
// import AdminDashboardPage from "./pages/AdminDashboardPage";

// export default function App() {
//   const adminUserId = "e483f8b4-1529-4a2a-a2ae-7922f4d0157a";

//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<ChatPage />} />
//         <Route path="/admin" element={<AdminDashboardPage />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }
