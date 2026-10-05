import React from "react";
import ReactDOM from "react-dom/client";
import AdminDashboard from "./AdminDashboard";
import { AdminAuthProvider } from "./adminAuth";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminAuthProvider>
      <AdminDashboard />
    </AdminAuthProvider>
  </React.StrictMode>,
);
