import { getInMemoryToken } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * Fetch helper that injects the in-memory Bearer token.
 * No localStorage reads — token lives only in module memory.
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getInMemoryToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // 401 on a non-auth route → clear in-memory state and redirect
  if (response.status === 401 && window.location.pathname !== "/login") {
    // Dispatch a custom event; AuthContext listens and clears state
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }
  
  if (response.status === 403) {
    const errorData = await response.clone().json().catch(() => ({}));
    if (errorData.error && errorData.error.includes("pending")) {
      alert("Your account is pending admin approval. You cannot access this application yet.");
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
  }

  return response;
}

export const api = {
  // Auth & Session
  // Supabase Auth handles login/register/session natively on the client
  // logout:   ()              => fetchWithAuth("/auth/logout",   { method: "POST" }),


  // Admin User Management
  getUsers:          ()                     => fetchWithAuth("/auth/users"),
  getPendingUsers:   ()                     => fetchWithAuth("/auth/pending"),
  approveUser:       (username: string)     => fetchWithAuth(`/auth/approve/${username}`,     { method: "POST" }),
  blacklistUser:     (username: string)     => fetchWithAuth(`/auth/blacklist/${username}`,   { method: "POST" }),
  unblacklistUser:   (username: string)     => fetchWithAuth(`/auth/unblacklist/${username}`, { method: "POST" }),
  updateUser:        (username: string, data: unknown) => fetchWithAuth(`/auth/users/${username}`, { method: "PUT",    body: JSON.stringify(data) }),
  deleteUser:        (username: string)     => fetchWithAuth(`/auth/users/${username}`,       { method: "DELETE" }),

  // Data & Analytics
  getHeatmap:        ()             => fetchWithAuth("/heatmap"),
  getNews:           ()             => fetchWithAuth("/news"),
  getSettings:       ()             => fetchWithAuth("/settings"),
  updateSettings:    (data: unknown) => fetchWithAuth("/settings", { method: "POST", body: JSON.stringify(data) }),

  // Watchlist
  getWatchlist:      ()             => fetchWithAuth("/watchlist"),
  addToWatchlist:    (id: string)   => fetchWithAuth(`/watchlist/${id}`,  { method: "POST" }),
  removeFromWatchlist:(id: string)  => fetchWithAuth(`/watchlist/${id}`,  { method: "DELETE" }),

  // Tracks
  getTrackHistory:   (id: string)   => fetchWithAuth(`/tracks/${id}/history`),

  // Analytics
  getAnalytics:      ()             => fetchWithAuth("/analytics/anomalies"),
  getTrackAnalytics: (id: string)   => fetchWithAuth(`/analytics/track/${id}`),
  analyze:           (data: unknown) => fetchWithAuth("/analyze", { method: "POST", body: JSON.stringify(data) }),

  // Health
  getHealth:         ()             => fetchWithAuth("/health"),

  // Zones & History
  getRestrictedZones:  ()           => fetchWithAuth("/zones/restricted"),
  getHistoricalAttacks:()           => fetchWithAuth("/history/attacks"),
};
