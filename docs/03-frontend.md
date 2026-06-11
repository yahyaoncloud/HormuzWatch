# Frontend Documentation

## 1. Framework & Tooling

| Tool | Version | Purpose |
|---|---|---|
| **React** | 18 | Component-based UI |
| **TypeScript** | 5.x | Static typing |
| **Vite** | 5.x | Build tool with fast HMR |
| **React Router v6** | 6.x | SPA routing with lazy loading |
| **Leaflet.js** | 1.9 | Interactive geospatial maps |
| **react-leaflet** | 4.x | React bindings for Leaflet |
| **leaflet.markercluster** | — | Marker clustering |
| **leaflet.heat** | — | Heatmap layer |
| **Recharts** | 2.x | Chart components |
| **Lucide React** | — | Icon set |

---

## 2. Routing Structure

All routes are defined in [`client/src/routes/index.tsx`](../client/src/routes/index.tsx).

```
/                          → PublicLandingPage (full-screen map)
/login                     → AuthPage (defaultTab="login")
/register                  → AuthPage (defaultTab="register")
/live                      → PublicLivePage (SSE-driven top-10 feed)
/docs                      → PublicDocsPage (self-contained layout)
/disclaimer                → DisclaimerPage (wrapped in PublicLayout)

# Protected (requires JWT + approved status)
/dashboard                 → DashboardPage (WebSocket map + anomaly overlay)
/about                     → AboutPage (project info)
/news                      → NewsPage (GDELT/RSS feed)
/analytics                 → AnalyticsPage (historical charts)
/analytics/track/:id       → TrackDetailsPage (single track analysis)
/insights                  → InsightsPage (AI summaries)
/settings                  → SettingsPage (system config)
/docs                      → DocsPage (internal reference, authenticated)

# Admin only
/admin                     → AdminPage (user management, requires role=admin)

# Catch-all
*                          → ErrorBoundary (404)
```

### Route Guards
- `<ProtectedRoute>` checks `AuthContext.isAuthenticated` — redirects to `/login` if false
- `<ProtectedRoute adminOnly>` additionally checks `user.role === 'admin'`
- All lazy-loaded pages are wrapped in `<Suspense fallback={<LoadingSpinner />}>`

---

## 3. Layout Hierarchy

```
<AuthProvider>                  ← JWT/session state for entire app
  <DisclaimerBanner />          ← One-time cookie-based disclaimer
  <Outlet />
    ├── PublicLandingPage        ← Self-contained (no layout wrapper)
    ├── AuthPage                 ← Self-contained
    ├── PublicLivePage           ← Self-contained  
    ├── PublicDocsPage           ← Self-contained
    │
    ├── <PublicLayout>           ← Navbar + Footer for public pages
    │   └── DisclaimerPage
    │
    └── <ProtectedRoute>
        └── <RootLayout>         ← Sidebar + TopBar for dashboard
            ├── DashboardPage
            ├── AnalyticsPage
            ├── InsightsPage
            ├── SettingsPage
            ├── NewsPage
            ├── DocsPage
            └── <ProtectedRoute adminOnly>
                └── AdminPage
```

---

## 4. Component Hierarchy

### Key Components
```
src/
├── components/
│   ├── HormuzMap.tsx          ← Leaflet map, cluster markers, heatmap layer
│   ├── ErrorBoundary.tsx      ← Catches render errors, shows fallback UI
│   ├── LoadingSpinner.tsx     ← Suspense fallback
│   ├── ProtectedRoute.tsx     ← Auth guard HOC
│   └── DisclaimerBanner.tsx   ← Cookie-based one-time disclaimer overlay
│
├── layouts/
│   ├── RootLayout.tsx         ← Dashboard sidebar + topbar
│   └── PublicLayout.tsx       ← Public pages nav (responsive, hamburger menu)
│
├── context/
│   ├── AuthContext.tsx        ← JWT session management (in-memory)
│   └── WebSocketContext.tsx   ← WebSocket connection + track/anomaly state
│
├── pages/
│   ├── PublicLandingPage.tsx  ← Full-screen Leaflet map + telemetry overlay
│   ├── PublicLivePage.tsx     ← SSE top-10 anomalous vessels list
│   ├── PublicDocsPage.tsx     ← Complete public documentation
│   ├── AuthPage.tsx           ← Login/Register card (unified, tab-switched)
│   ├── DashboardPage.tsx      ← Primary operator view
│   ├── AnalyticsPage.tsx      ← Recharts time-series, statistics
│   ├── InsightsPage.tsx       ← AI threat summaries
│   ├── NewsPage.tsx           ← GDELT/RSS intelligence feed
│   ├── SettingsPage.tsx       ← System configuration
│   ├── AdminPage.tsx          ← User management (admin only)
│   ├── TrackDetailsPage.tsx   ← Single vessel deep-dive
│   └── AboutPage.tsx          ← Project information
│
├── services/
│   └── api.ts                 ← All HTTP API calls, global 401 handler
│
├── hooks/
│   └── (custom hooks)
│
└── routes/
    └── index.tsx              ← Route configuration
```

---

## 5. State Management

HormuzWatch uses **React Context** for global state. There is no Redux or Zustand.

### AuthContext (`context/AuthContext.tsx`)
```typescript
// Module-level (not localStorage) — in-memory token storage
let _token: string | null = null;
let _tokenExpiry: Date | null = null;

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; email: string; role: string } | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}
```

**Design Decision**: Token stored in module-level closure (not localStorage, not sessionStorage) to prevent XSS token theft. Token is lost on page refresh (user must re-authenticate), which is intentional for this security posture.

### WebSocketContext (`context/WebSocketContext.tsx`)
```typescript
interface WebSocketContextType {
  tracks: Map<string, Track>;        // trackId → latest telemetry
  anomalies: Map<string, Anomaly>;   // trackId → latest anomaly result
  isConnected: boolean;
}
```
The context maintains the WebSocket connection and merges incoming `telemetry` and `anomaly` messages into maps keyed by `trackId`. React re-renders triggered by spreading into arrays.

### Local Component State
Individual pages use `useState` / `useEffect` for local data fetching, form state, pagination, and filters.

---

## 6. HormuzMap Component

[`HormuzMap.tsx`](../client/src/components/HormuzMap.tsx) is the most complex component. It manages:

1. **Leaflet map initialization** — `MapContainer` from react-leaflet
2. **Marker cluster group** — via `leaflet.markercluster`, custom cluster icon
3. **Heatmap layer** — via `leaflet.heat` with enriched gradient
4. **Custom SVG markers** — circular arrow icons that rotate with vessel heading, soft heartbeat pulse for threats/selected markers
5. **Watch zones** — Static restricted zone polygons with labels
6. **Popup system** — Rich HTML popups with track intelligence + watchlist button
7. **Scroll-spy track selection** — `useSearchParams` drives `flyTo` behavior
8. **Heatmap animation** — Point interpolation via `requestAnimationFrame`

**Icon Design:**
- Circle base + arrow pointer that rotates to show heading
- Severity-colored (green=low, amber=medium, orange=high, red=critical)
- Selected items: indigo gradient fill + scale(1.25) + glow filter
- Anomalous/selected: Soft dual-ring heartbeat (filled + stroke, 1.5s–2.5s)

---

## 7. Authentication Implementation

```typescript
// services/api.ts — global 401 handler
function attachAuthHeaders(options: RequestInit): RequestInit {
  const token = authContext.getToken();
  if (token) {
    options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  }
  return options;
}

// On 401 response, dispatch global event
window.dispatchEvent(new CustomEvent('auth:unauthorized'));
```

```typescript
// AuthContext listens for the event
useEffect(() => {
  window.addEventListener('auth:unauthorized', handleUnauthorized);
  return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
}, []);
```

---

## 8. Page Details

### PublicLandingPage
- **Purpose:** Marketing/showcase page with live vessel data visible to everyone
- **User Journey:** Land → see map with vessels moving → click vessel for popup → prompted to login for full access
- **API Dependencies:** WebSocketContext for live tracks, `/history/attacks` for incident markers
- **State:** `windowWidth`, `mobileMenuOpen`, clock ticker, `useWebSocket()` for tracks/anomalies

### DashboardPage  
- **Purpose:** Primary operator workspace
- **User Journey:** Login → see real-time map + threat sidebar + heatmap toggle
- **API Dependencies:** WebSocket `/ws/stream`, `/heatmap`, `/history/attacks`, `/zones/restricted`
- **State:** `selectedTrackId` (via `useSearchParams`), `showHeatmap` toggle

### AnalyticsPage
- **Purpose:** Historical analysis and statistics
- **User Journey:** Navigate to Analytics → select time range → view charts of anomaly trends, vessel counts, score distributions
- **API Dependencies:** `/tracks/:id/history`, REST history endpoints
- **State:** Time range selector, chart data, pagination

### AdminPage
- **Purpose:** Administrator user management
- **User Journey:** Admin login → view pending registrations → approve/reject → manage blacklist
- **API Dependencies:** `/auth/users`, `/auth/pending`, `/auth/approve/:username`, `/auth/blacklist/:username`, `/auth/unblacklist/:username`
- **Business Logic:** Admins cannot blacklist themselves (enforced server-side too)

### AuthPage
- **Purpose:** Unified login + registration (single card, tab-switched)
- **User Journey:** Visit `/login` → card with login form → click "Need access?" → form swaps to register → submit registration → "Pending admin approval" message
- **State:** `activeTab: 'login' | 'register'`

---

## 9. Theme System

HormuzWatch uses a custom CSS design system defined in [`client/src/index.css`](../client/src/index.css).

**Design Language:**
- Dark navy background (`#020617` to `#0a0f1a`)
- Indigo primary (`#4f46e5`, `#6366f1`, `#818cf8`)
- Cyan accent (`#22d3ee`, `#38bdf8`)
- Amber/copper for maritime assets (`#b87333`)
- Red for threats (`#ef4444`)
- Green for healthy/low (`#22c55e`)

**Typography:** `Space Grotesk` (UI), `JetBrains Mono` (technical data/IDs)

**CSS Utilities:**
```css
.hide-mobile { /* display: flex on desktop, none on mobile */ }
.show-mobile { /* display: none on desktop, flex on mobile */ }
.btn { /* base button style */ }
.btn-primary { /* indigo filled */ }
.btn-ghost { /* transparent with border */ }
.docs-layout-grid { /* sidebar + content grid for docs page */ }
.docs-sidebar { /* sticky sidebar */ }
.docs-mobile-nav { /* horizontal scrolling mobile nav */ }
```

**Responsive Breakpoint:** `@media (max-width: 768px)` for mobile adaptations.

---

## 10. Feature-to-Component Mapping

| Feature | Component(s) |
|---|---|
| Live vessel map | `HormuzMap`, `WebSocketContext`, `PublicLandingPage` |
| Anomaly scoring display | `DashboardPage`, `HormuzMap` popup |
| Heatmap toggle | `DashboardPage`, `HormuzMap` |
| Watch zones | `HormuzMap` (static polygon overlay) |
| Top-10 anomalous feed | `PublicLivePage`, SSE `/public/stream` |
| Login/Register | `AuthPage`, `AuthContext` |
| Admin approvals | `AdminPage` |
| Track history charts | `AnalyticsPage`, `TrackDetailsPage` |
| News feed | `NewsPage` |
| Watchlist management | `DashboardPage` or inline popup |
| System settings | `SettingsPage` |
