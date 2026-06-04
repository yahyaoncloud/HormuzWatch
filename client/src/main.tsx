import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";
import { WebSocketProvider } from "./context/WebSocketContext";
import "./index.css";

// Global fetch interceptor to inject JWT token
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem("token");
  const headers = new Headers(init?.headers);
  if (token && typeof input === "string" && input.startsWith("/api")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await originalFetch(input, { ...init, headers });
  
  // If the token is invalid or expired, log out
  if (response.status === 401 && window.location.pathname !== "/login") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("expiresAt");
    window.location.href = "/login";
  }
  return response;
};

const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
  </React.StrictMode>,
);
