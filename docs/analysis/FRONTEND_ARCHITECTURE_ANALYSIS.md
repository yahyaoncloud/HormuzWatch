# Frontend Architecture Analysis — HormuzWatch Client-v2

**Generated:** 2026-07-21  
**Framework:** React 18 + TypeScript + Vite + React Router v7 (SSR)  
**State Management:** Zustand (5 stores) + TanStack Query (server state)  
**Styling:** Tailwind CSS v3 + CSS Variables (design tokens) + next-themes (light-only)  
**Map Library:** MapLibre GL (EditorialMap) + Leaflet (LeafletMap) — dual stack  
**Real-time:** WebSocket + SSE via custom provider  
**Charts:** Custom SVG (SparklineChart) — no charting library  
**UI Components:** Custom shadcn-style primitives (Button, Card, Sheet, etc.) — no Radix UI

---

## Executive Summary

### Overall Architecture Maturity: **B+ (Strong foundation, specific gaps)**

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Architecture** | 8/10 | Clean provider composition, clear route layouts, SSR-ready |
| **Folder Structure** | 7/10 | Logical but `components/maps` has 2 competing implementations |
| **Component Design** | 7/10 | Good atomic design, but `HomePage` (1760 lines) is a God Component |
| **Type Safety** | 9/10 | Excellent TS interfaces, strict mode, no `any` in typed code |
| **Performance** | 6/10 | Heavy map components, no code splitting on routes, large bundle |
| **Developer Experience** | 8/10 | Good aliases, linting, path imports, hot module replacement |
| **Scalability** | 7/10 | Zustand scales, but dual map libraries + monolithic routes hinder growth |
| **Maintainability** | 6/10 | God component, duplicated logic, mixed concerns in `_layout.tsx` |
| **Consistency** | 8/10 | CSS variables, design tokens, consistent naming conventions |
| **Accessibility** | 7/10 | ARIA roles, focus management, keyboard nav — but some gaps |

**Immediate Risks:**
1. **God Component** — `_layout.tsx:HomePage` is 1,760 lines with map, state, UI, data fetching all mixed
2. **Dual Map Stack** — MapLibre GL + Leaflet both loaded, different APIs, different data formats
3. **No Route Code Splitting** — All routes in single bundle (~500KB+ gzipped estimated)
4. **WebSocket/SSE Logic in Provider** — 300+ lines of reconnection logic in `providers.tsx` should be extracted
5. **Hardcoded Fallback Data** — `_layout.tsx` lines 15-112 contain 100+ lines of static fallback data

---

## 1. Repository Overview

### 1.1 Technology Stack

```
Framework:        React 18.3 (Vite 5, React Router v7 SSR)
Language:         TypeScript 5.5 (strict mode)
State:            Zustand 4.5 (5 stores) + TanStack Query 5.60
Styling:          Tailwind CSS 3.4 + CSS Custom Properties (design tokens)
Maps:             MapLibre GL 4.7 (primary) + Leaflet 1.9 (legacy homepage)
Real-time:        Native WebSocket + EventSource (SSE)
Icons:            lucide-react 0.45
Utils:            clsx + tailwind-merge (cn helper), date-fns (not used — custom formatters)
Build:            Vite 5 + esbuild (fast HMR)
Testing:          None found (no .test.tsx, no vitest, no playwright)
```

### 1.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  React Tree  │  │  Zustand     │  │  TanStack    │             │
│  │  (Components)│◄─│  Stores (5)  │  │  Query Cache │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                     │
│         ▼                 ▼                 ▼                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Providers (Context)                    │    │
│  │  ThemeProvider → TimeProvider → MapProvider → WSProvider  │    │
│  └──────────────────────────────────────────────────────────┘    │
│         │                                                     │    │
│         ▼                                                     │    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Routing (React Router v7)             │  │
│  │  Layout Routes: _layout (public) / intelligence / learn  │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                     │    │
│         ▼                                                     │    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Data Layer                           │  │
│  │  lib/api.ts (fetchWithAuth, fetchPublic, WS/SSE helpers) │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Folder Responsibility Tree

```
client-v2/
├── src/
│   ├── app/
│   │   └── routes/              # File-based routing (React Router v7)
│   │       ├── _layout.tsx      # ★ MASSIVE — 1,760 lines, layout + HomePage + shared UI
│   │       ├── index.tsx        # Thin wrapper → HomePage
│   │       ├── dashboard.tsx    # Admin dashboard (auth-gated)
│   │       ├── intelligence/    # Intelligence pages (SSR loaders)
│   │       ├── learn/           # Documentation pages (TOC + scroll spy)
│   │       ├── api/             # API reference (static)
│   │       ├── deploy/          # Deployment guide
│   │       └── about.tsx        # About page
│   │
│   ├── components/
│   │   ├── ui/                  # Primitive components (Button, Card, Sheet, Input*)
│   │   ├── maps/                # ★ DUAL STACK — MapLibre (EditorialMap) + Leaflet
│   │   │   ├── EditorialMap.tsx # 992 lines — MapLibre GL, production map
│   │   │   ├── LeafletMap.tsx   # 856 lines — Leaflet, homepage only
│   │   │   └── MapContainer.tsx # Thin wrapper
│   │   ├── data/                # Metric components (MetricGrid, SparklineChart)
│   │   └── charts/              # (empty — SparklineChart in data/)
│   │
│   ├── stores/                  # Zustand stores (single index.ts — 751 lines)
│   │   └── index.ts             # UI, Map, Metric, Incident, Auth, Settings
│   │
│   ├── providers/               # Context providers (single providers.tsx — 657 lines)
│   │   └── providers.tsx        # Theme, WebSocket, Map, Time, composed Providers
│   │
│   ├── lib/
│   │   └── api.ts               # ★ 536 lines — all REST + WS/SSE endpoints
│   │
│   ├── hooks/                   # (empty — custom hooks inlined in components)
│   │
│   ├── types/
│   │   └── websocket.ts         # WS message types, payloads, ConflictEvent
│   │
│   ├── utils/
│   │   └── cn.ts                # 370 lines — cn + formatters + utilities
│   │
│   ├── main.tsx                 # Entry — React 18 createRoot + Providers
│   ├── App.tsx                  # Router definition (lazy routes)
│   ├── index.css                # Tailwind + CSS variables (design tokens)
│   └── vite-env.d.ts
```

### 1.4 Dependency Graph (Key Packages)

```
react@18.3
├── react-router@7 (SSR, loaders, actions)
├── @tanstack/react-query@5 (server state, caching, deduping)
├── zustand@4 (client state, 5 stores with immer middleware)
├── maplibre-gl@4.7 (primary map)
├── react-leaflet@4 + leaflet@1.9 + leaflet.markercluster + leaflet.heat (legacy map)
├── lucide-react@0.45 (icons)
├── next-themes@0.4 (light-only theme)
├── clsx@2 + tailwind-merge@2 (cn utility)
└── vite@5 (build, HMR)
```

### 1.5 Startup Flow

```
main.tsx
  └─ createRoot → <React.StrictMode>
        └─ <Providers> (composed)
              ├─ ThemeProvider (next-themes, forced light)
              ├─ TimeProvider (server time sync, 60s interval)
              ├─ MapProvider (MapLibre state, viewport, layers)
              └─ WebSocketProvider (WS + SSE, auto-reconnect, subscriptions)
                    └─ <RouterProvider router={router}>
                          └─ Routes (lazy loaded via React.lazy)
```

### 1.6 Rendering Flow (Homepage)

```
IndexRoute (index.tsx)
  └─ HomePage (_layout.tsx:451-1761)
        ├─ Loader (SSR) → fetches /public/metrics, /public/top-traces, /public/briefing
        ├─ DisclaimerModal (once per session)
        ├─ Left Aside (Map Legend — 300+ lines of JSX)
        ├─ Center Map (LeafletMap + control bar)
        ├─ Right Aside (Threat List — filtered, sortable)
        ├─ Floating Metric Strip (LiveStatStrip — clickable → BottomSheet)
        ├─ Metric Detail Sheet (BottomSheet — dynamic content per metric)
        ├─ Settings Sheet (BottomSheet)
        ├─ Threat Detail Modal (inline)
        ├─ Toast Container (custom)
        └─ Global Loader Overlay (report generation)
```

### 1.7 Navigation Flow

```
Public Routes (no auth):     /  /intelligence/*  /learn/*  /api  /deploy  /about
Protected Route (admin):     /dashboard          (requires JWT + admin role)
Layouts:
  _layout.tsx        → Navbar + PageContainer + Footer (public pages)
  intelligence/      → IntelligenceLayout (Navbar + Outlet + Footer)
  learn/             → LearnLayout (PageContainer + FloatingTOC + scroll spy)
```

### 1.8 State Flow

```
Server State (TanStack Query):
  ──► loaders (SSR) ──► Query Cache ──► Components (useQuery)
  ──► WebSocket/SSE ──► WebSocketProvider state ──► subscribe() ──► Components

Client State (Zustand):
  UI Store      → modals, sidebars, toasts, loading, mobile
  Map Store     → viewport, layers, selection, tools, mapInstance
  Metric Store  → real-time metrics, subscriptions
  Incident Store→ alerts, history, filters, computed getters
  Auth Store    → user, token, login/logout, permissions
  Settings Store→ theme, units, mapStyle, notifications, persistence
```

---

## 2. Project Structure Review

### 2.1 Directory Cohesion & Coupling

| Directory | Responsibility | Cohesion | Coupling | Issues |
|-----------|---------------|----------|----------|--------|
| `app/routes/` | Routing + page components | **Low** | High | `_layout.tsx` is 1,760 lines — mixes layout, homepage, shared UI, data fetching |
| `components/ui/` | Primitive components | **High** | Low | Good — self-contained, reusable |
| `components/maps/` | Map components | **Low** | High | **Two competing implementations** (MapLibre + Leaflet) with different APIs |
| `components/data/` | Metric display | **High** | Medium | Good separation, but `SparklineChart` should be in `charts/` |
| `stores/` | Zustand stores | **Medium** | Medium | Single `index.ts` (751 lines) — should be split per store |
| `providers/` | Context providers | **Low** | High | Single `providers.tsx` (657 lines) — WS logic should be extracted |
| `lib/api.ts` | API client | **High** | Low | Well-organized, typed, but 536 lines — consider splitting by domain |
| `hooks/` | Custom hooks | **N/A** | N/A | **Empty** — hooks inlined in components |

### 2.2 Architectural Violations

1. **`_layout.tsx` is a God File** — Contains:
   - `HomePage` component (1,300+ lines)
   - `PageContainer`, `Section`, `DisclaimerModal`, `LiveStatStrip`, `SettingToggle`
   - `IntelligenceLayout`, `LearnLayout`, `FloatingTOC`
   - 100+ lines of static fallback data (`FALLBACK` constant)
   - Multiple `useState`/`useEffect` for homepage-specific UI state

2. **Dual Map Stack** — `components/maps/` contains:
   - `EditorialMap.tsx` (MapLibre GL) — 992 lines, used by intelligence pages
   - `LeafletMap.tsx` (Leaflet) — 856 lines, used **only** by homepage
   - Different data formats, different APIs, different styling approaches

3. **No Route Code Splitting** — `App.tsx` imports all routes eagerly:
   ```tsx
   import IndexRoute from './routes/index';        // eager
   import DashboardRoute from './routes/dashboard'; // eager
   import IntelligenceLayout from './routes/intelligence'; // eager
   ```

4. **Providers Monolith** — `providers.tsx` contains:
   - `WebSocketProvider` (300+ lines of reconnection logic)
   - `MapProvider` (MapLibre state)
   - `TimeProvider` (server time sync)
   - `ThemeProvider` (light-only)
   - Composed `Providers` wrapper

5. **Stores Monolith** — `stores/index.ts` (751 lines) contains 6 stores:
   - `useUIStore`, `useMapStore`, `useMetricStore`, `useIncidentStore`, `useAuthStore`, `useSettingsStore`
   - Should be separate files for tree-shaking and ownership clarity

---

## 3. Component Architecture

### 3.1 Component Inventory & Complexity Report

| Component | File | Lines | Complexity | Category | Issues |
|-----------|------|-------|------------|----------|--------|
| `HomePage` | `_layout.tsx:451` | **~1,300** | **Very High** | Page/God | Mixed concerns: data, map, UI, state, effects |
| `EditorialMap` | `EditorialMap.tsx` | 992 | **Very High** | Map | MapLibre lifecycle, layer mgmt, controls, error UI |
| `LeafletMap` | `LeafletMap.tsx` | 856 | **Very High** | Map | Leaflet + markercluster + heat + conflicts + WS subscription |
| `DashboardRoute` | `dashboard.tsx` | 638 | **High** | Page | Admin tabs, mutations, forms, auth logic |
| `MetricGrid` | `MetricGrid.tsx` | 850 | **High** | Data | Metrics, cards, grids, live hooks, static exports |
| `Providers` | `providers.tsx` | 657 | **High** | Context | 4 providers + composition |
| `Stores` | `stores/index.ts` | 751 | **High** | State | 6 stores in one file |
| `Navbar` | `navbar.tsx` | 235 | Medium | UI | Focus trap, animations, mobile dropdown |
| `BottomSheet` | `sheet.tsx` | 127 | Medium | UI | Animation, portal, focus management |
| `Section` | `_layout.tsx:151` | 36 | Low | Layout | Simple wrapper |
| `Button` | `button.tsx` | 54 | Low | Primitive | shadcn-style, cva-free |
| `Card` | `card.tsx` | ~50 | Low | Primitive | Composed primitives |

### 3.2 Complexity Categorization

**Very High (>800 lines / multiple responsibilities)**
- `HomePage` — **Must split**: Map, Legend, ThreatList, MetricStrip, Sheets, Modals, Toasts
- `EditorialMap` — **Should split**: Layer management, controls, error UI, click handling
- `LeafletMap` — **Must replace**: Legacy, duplicate of EditorialMap functionality

**High (400-800 lines / clear but large responsibility)**
- `DashboardRoute` — Admin dashboard, could split tabs into components
- `MetricGrid` — Metrics + live hooks + static exports — split live vs static
- `Providers` — Extract `WebSocketProvider` to own file
- `Stores` — Split into `uiStore.ts`, `mapStore.ts`, etc.

**Medium (100-400 lines / focused)**
- `Navbar`, `BottomSheet`, `LeafletMap` (if kept)

**Low (<100 lines / single responsibility)**
- `Section`, `Button`, `Card`, `Input` (missing), `Badge` (inline in dashboard)

### 3.3 Composition Patterns

| Pattern | Example | Assessment |
|---------|---------|------------|
| **Compound Components** | `Card` + `CardHeader` + `CardContent` | ✅ Good |
| **Render Props / Slots** | `Button.asChild` (Radix Slot) | ✅ Good |
| **Provider Composition** | `Providers` → `Theme` → `Time` → `Map` → `WS` | ✅ Clean |
| **Layout Components** | `PageContainer`, `Section`, `IntelligenceLayout` | ✅ Good |
| **God Component** | `HomePage` | ❌ Anti-pattern |
| **Duplicate Implementation** | `EditorialMap` vs `LeafletMap` | ❌ Anti-pattern |

---

## 4. React Review

### 4.1 Hooks Usage

| Hook | Usage Quality | Issues |
|------|---------------|--------|
| `useState` | Good | Some components have 10+ `useState` (HomePage: 15+) |
| `useEffect` | **Mixed** | Cleanup mostly correct, but `LeafletMap` has complex effect dependencies |
| `useCallback` | Good | Used for event handlers, subscriptions |
| `useMemo` | **Underused** | Expensive computations (filtering, grouping) not memoized |
| `useRef` | Good | Map instances, timeouts, subscriptions |
| `useContext` | Good | Typed contexts, proper error boundaries |
| `useReducer` | **Not used** | Complex state (IncidentStore filters) would benefit |

### 4.2 Effect Patterns

**Good:**
```tsx
// Cleanup properly handled
useEffect(() => {
  const unsub = subscribe('telemetry', handler);
  return () => unsub();
}, [subscribe]);
```

**Problematic (LeafletMap.tsx:338-374):**
```tsx
useEffect(() => {
  // 100+ lines, multiple subscriptions, complex cleanup
  // Dependencies: [map, tracks, selectedTrackId, showConflicts, conflictData, timeline, severityFilter, regionFilter]
  // Re-runs on ANY filter change, recreates ALL markers
}, [map, tracks, selectedTrackId, showConflicts, conflictData, timeline, severityFilter, regionFilter]);
```

### 4.3 Memoization Gaps

| Location | Expensive Operation | Missing Memoization |
|----------|---------------------|---------------------|
| `HomePage` filtered threats | `liveTraces.filter()` + `map()` + `JSON.parse()` | `useMemo` on `filteredTraces` |
| `EditorialMap` layer sync | `layers.forEach()` + `map.setPaintProperty()` | `useMemo` on layer config |
| `LeafletMap` marker creation | `L.marker()` + `bindPopup()` per track | `useMemo` on marker data |
| `MetricGrid` sparkline | SVG path generation | `React.memo` on `SparklineChart` |

### 4.4 React Anti-Patterns Found

| Pattern | Location | Severity |
|---------|----------|----------|
| **God Component** | `HomePage` in `_layout.tsx` | 🔴 Critical |
| **Inline Event Handlers in JSX** | Multiple (`onClick={() => setX(y)}`) | 🟡 Medium |
| **Derived State in useState** | `HomePage`: `topThreats` derived from `liveTraces` | 🟡 Medium |
| **Stale Closure Risk** | `LeafletMap` `useEffect` with `tracks` dependency | 🟠 High |
| **No Error Boundaries** | Entire app | 🟠 High |
| **No Suspense/Lazy** | All routes eager in `App.tsx` | 🟠 High |

### 4.5 Routing & SSR

- **React Router v7** with SSR loaders — ✅ Good
- **Loaders** used for intelligence page (`intelligence/index.tsx:120-191`)
- **No `defer` or streaming** — could improve TTFB
- **No route-level code splitting** — all `lazy()` — all imported eagerly in `App.tsx`

---

## 5. TypeScript Review

### 5.1 Type Safety Assessment: **9/10**

```tsx
// Strict mode enabled
// No 'any' in typed code (only in untyped library interop)
// Discriminated unions used correctly (WSMessageType)
// Generics used in stores, hooks, API client
```

### 5.2 Type Organization

| File | Types | Quality |
|------|-------|---------|
| `types/websocket.ts` | 15+ interfaces, discriminated unions | ✅ Excellent |
| `lib/api.ts` | 25+ response types, mirror backend | ✅ Excellent |
| `stores/index.ts` | 6 store state types with Immer | ✅ Good |
| `components/maps/EditorialMap.tsx` | `IntelligenceLayer`, `RegionKey` | ✅ Good |
| `components/data/MetricGrid.tsx` | `Metric`, `MetricCardProps` | ✅ Good |

### 5.3 Type Gaps

1. **`LeafletMap.tsx`** — Uses `any` for Leaflet types (no `@types/leaflet` installed?):
   ```tsx
   clusterRef = useRef<any>(null);  // Should be MarkerClusterGroup
   heatRef = useRef<any>(null);     // Should be HeatLayer
   ```

2. **`providers.tsx` WebSocketContext** — `payload: unknown` in `subscribe`:
   ```tsx
   subscribe: (type: WSMessageType, callback: (payload: unknown) => void) => () => void;
   // Should be generic: subscribe<T>(type, callback: (payload: T) => void)
   ```

3. **`MetricGrid.tsx`** — `format: (v: number) => string` but static metrics pass string values:
   ```tsx
   format: (v) => v.toString(),  // TypeScript allows but runtime expects number
   ```

4. **Route Loader Types** — `useLoaderData` inferred but not explicitly typed in some routes.

### 5.4 Duplicate Types

- `TelemetryPayload` defined in `types/websocket.ts` AND implied in `lib/api.ts` `ActiveTrack`
- `TopTrace` in `types/websocket.ts` AND `lib/api.ts` (same shape, different names)
- `ConflictEvent` in `types/websocket.ts` AND used in `LeafletMap.tsx` with local `severityColor` map

---

## 6. Styling Review

### 6.1 Design Token System (CSS Variables)

```css
/* index.css — well-organized design tokens */
:root {
  /* Color primitives */
  --color-primary-50: #f0f9ff; ... --color-primary-950: #082f49;
  --color-neutral-0: #ffffff; ... --color-neutral-950: #030712;
  
  /* Semantic aliases */
  --color-bg: var(--color-neutral-0);
  --color-bg-card: var(--color-neutral-50);
  --color-bg-elevated: var(--color-neutral-100);
  --color-fg: var(--color-neutral-900);
  --color-fg-muted: var(--color-neutral-500);
  --color-border: var(--color-neutral-200);
  --color-primary-600: #0ea5e9;  /* editorial blue */
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-success: #22c55e;
  --color-info: #0ea5e9;
}
```

**Strengths:**
- Complete semantic token system (bg, fg, border, primary, danger, warning, success, info)
- Consistent usage across components via `var(--color-*)`
- No hardcoded Tailwind colors in components (e.g., `bg-[var(--color-primary-600)]`)

**Issues:**
- **Light-only** — `next-themes` forced to `light`, no dark mode implementation
- **Inconsistent opacity syntax** — Some use `/50` (Tailwind), some use `rgba()` in inline styles
- **Magic values in inline styles** — `LeafletMap` uses `style={{ color: '#ef4444' }}` instead of tokens

### 6.2 Tailwind Usage

| Pattern | Usage | Assessment |
|---------|-------|------------|
| `cn()` utility | Everywhere | ✅ Consistent |
| Arbitrary values `bg-[var(--color-*)]` | All components | ✅ Design token integration |
| Responsive prefixes | `sm:`, `md:`, `lg:`, `xl:`, `2xl:` | ✅ Good |
| Dark mode variants | None (light-only) | ⚠️ Missing |
| Container queries | None | ⚠️ Not used |
| CSS Grid/Flex | Extensive | ✅ Good |

### 6.3 Spacing & Typography Consistency

| Scale | Usage | Consistency |
|-------|-------|-------------|
| Spacing | Tailwind scale (4, 8, 12, 16, 24, 32...) | ✅ Consistent |
| Typography | Custom `--font-display`, `--font-ui`, `--font-data` | ✅ Good |
| Font sizes | Tailwind `text-xs` to `text-4xl` + custom `text-data-*` | ⚠️ Mixed |
| Line heights | Tailwind defaults | ✅ OK |

**Issues:**
- Custom `text-data-*` classes in `index.css` but not documented
- `font-data` used for numbers, `font-ui` for UI text, `font-display` for headings — good convention but not enforced

### 6.4 Animation Consistency

- **Custom keyframes** in `index.css`: `animate-overlay-enter`, `animate-dropdown-enter`, `animate-pulse-slow`
- **Transition durations**: 150ms, 250ms, 300ms, 500ms — inconsistent
- **Easing**: `cubic-bezier(0.32,0.72,0,1)` used in sheets — good
- **Reduce motion** — Implemented in `HomePage` via `reduceMotion` state + CSS class

---

## 7. Performance Audit

### 7.1 Bundle Size Estimation (No Build Stats Available)

| Category | Estimated Impact |
|----------|------------------|
| React + Router + Query + Zustand | ~120 KB gzipped |
| MapLibre GL | ~180 KB gzipped |
| Leaflet + MarkerCluster + Heat | ~140 KB gzipped |
| Lucide Icons | ~60 KB gzipped (tree-shaken) |
| **Total (estimated)** | **~500+ KB gzipped** |

**Critical:** Both map libraries loaded on homepage (Leaflet) AND intelligence pages (MapLibre). No code splitting.

### 7.2 Render Performance

| Component | Re-render Triggers | Optimization |
|-----------|-------------------|--------------|
| `HomePage` | Any metric change, WS message, filter change | ❌ No `React.memo`, 15+ `useState` |
| `LeafletMap` | `tracks` array (new reference every WS msg), filters | ❌ Recreates ALL markers on every update |
| `EditorialMap` | `visibleLayers`, `layerOpacities`, `viewport` | ⚠️ `useEffect` syncs all layers on any change |
| `MetricGrid` | Query data change | ✅ `useQuery` handles deduping |
| `Navbar` | Route change | ✅ Minimal |

### 7.3 Specific Performance Issues

1. **`LeafletMap` Marker Recreation** (lines 338-374):
   ```tsx
   // On EVERY filter change or track update:
   tracks.forEach(t => { /* create marker, bindPopup, add to cluster */ });
   // No diffing, no reuse — O(N) DOM operations per update
   ```

2. **`HomePage` Derived State Recalculation** (lines 516-613):
   ```tsx
   const filteredTraces = liveTraces.filter(...).map(...) // Runs every render
   const topThreats = filteredTraces.map(...)             // Runs every render
   // No useMemo, runs on every WS message (high frequency)
   ```

3. **`EditorialMap` Layer Sync** (lines 583-603):
   ```tsx
   useEffect(() => {
     layers.forEach(layer => { /* setPaintProperty for EACH layer */ });
   }, [visibleLayers, layerOpacities, layers]);
   // Runs on ANY opacity/visibility change, iterates all 20+ layers
   ```

4. **No Virtualization** — Threat lists render all items (up to 100+)

5. **No Image Optimization** — Map tiles from external CDNs, no control

### 7.4 Code Splitting Opportunities

| Route | Current | Recommended |
|-------|---------|-------------|
| `/` (HomePage) | Eager | Lazy (heavy: Leaflet + charts) |
| `/dashboard` | Eager | Lazy (admin only) |
| `/intelligence/*` | Eager | Lazy (MapLibre heavy) |
| `/learn/*` | Eager | Lazy (documentation) |
| `/api`, `/deploy`, `/about` | Eager | Could be static |

---

## 8. State Management

### 8.1 Zustand Stores (5 + 1 settings)

| Store | Responsibility | Persistence | Subscriptions |
|-------|---------------|-------------|---------------|
| `useUIStore` | Modals, sidebars, toasts, loading, mobile | No | `subscribeWithSelector` |
| `useMapStore` | Viewport, layers, selection, tools, mapInstance | No | `subscribeWithSelector` |
| `useMetricStore` | Real-time metrics, subscriptions | No | Custom pub/sub via `Set<callback>` |
| `useIncidentStore` | Incidents, alerts, history, filters | No | `subscribeWithSelector` |
| `useAuthStore` | User, token, login/logout, permissions | `localStorage` (token) | `subscribeWithSelector` |
| `useSettingsStore` | Theme, units, mapStyle, notifications | `localStorage` (full) | `subscribeWithSelector` |

### 8.2 State Architecture Assessment

| Aspect | Score | Notes |
|--------|-------|-------|
| **Separation of Concerns** | 8/10 | Clear domain separation |
| **Server vs Client State** | 7/10 | TanStack Query for server, Zustand for client — good but `MetricStore` duplicates query data |
| **Derived State** | 6/10 | `IncidentStore` has computed getters — good; `HomePage` derives `topThreats` in render — bad |
| **Persistence** | 7/10 | Auth + Settings persist; others don't (correct) |
| **Type Safety** | 9/10 | Immer + strict typing |
| **Testing** | 0/10 | No store tests |

### 8.3 Issues

1. **`MetricStore` duplicates TanStack Query** — `LiveMaritimeMetrics` uses `useQuery` but `MetricStore` exists for real-time. Should unify.

2. **`MapStore` holds `mapInstance`** — Anti-pattern (non-serializable, couples store to MapLibre instance). Used for `flyTo`.

3. **`IncidentStore` filters in state** — Filters stored in store, but `HomePage` has local filter state (`timeline`, `severityFilter`, `regionFilter`). **Duplicate filter state**.

4. **No middleware for persistence** — `useSettingsStore` manually calls `save()` in every setter. Should use `persist` middleware.

---

## 9. Data Layer

### 9.1 API Client (`lib/api.ts`)

**Structure:**
- `fetchWithAuth` — Bearer token from `useAuthStore`
- `fetchPublic` — No auth
- Domain functions: `getPublicMetrics`, `getTopTraces`, `getNews`, `getConflictFeed`, `getHeatmap`, `getAIBriefing`, `getDetailedReport`, `postTelemetry`, `analyzeTelemetry`, admin functions, dataset functions
- WS/SSE helpers: `createTelemetryWS()`, `createTracesSSE()`

**Strengths:**
- Fully typed request/response
- Consistent error handling (throws on non-OK)
- Environment-based base URL (`VITE_API_URL`)

**Issues:**
- **536 lines** — Should split: `api/public.ts`, `api/auth.ts`, `api/admin.ts`, `api/datasets.ts`, `api/ws.ts`
- **No request/response interceptors** — Token refresh logic duplicated in `AuthStore.refreshToken`
- **No retry logic** — Except manual `retry()` in query options
- **No cancellation** — `AbortSignal` not used

### 9.2 Data Fetching Patterns

| Pattern | Usage | Assessment |
|---------|-------|------------|
| **SSR Loaders** | `intelligence/index.tsx` loader | ✅ Good — data before render |
| **TanStack Query** | Most components (`useQuery`) | ✅ Good — caching, deduping, refetch |
| **WebSocket** | `WebSocketProvider` + `subscribe()` | ⚠️ Manual subscription management |
| **SSE** | `WebSocketProvider` (EventSource) | ⚠️ Same as WS |
| **Optimistic Updates** | Dashboard mutations (`useMutation`) | ✅ Good — `onSuccess` invalidates queries |

### 9.3 Real-time Data Flow

```
Backend WS/SSE
      │
      ▼
WebSocketProvider (context)
      │
      ├─► setTelemetry(payload) ──► UI state (last message)
      ├─► setAnomaly(payload) ────► UI state
      ├─► setTraces(payload) ─────► UI state
      │
      └─► subscriptionsRef (Map<type, Set<callback>>)
            │
            ▼
       Components call subscribe('telemetry', cb)
            │
            ▼
       Local state update (e.g., LeafletMap tracks)
```

**Issues:**
- `WebSocketProvider` holds `telemetry`, `anomaly`, `traces` as **single values** (last message only) — no history
- `LeafletMap` maintains own `tracks` state duplicate from WS
- No message deduplication or sequencing
- Reconnection logic: exponential backoff but **max 10 attempts** then gives up permanently

---

## 10. Realtime Systems

### 10.1 WebSocket Implementation (`providers.tsx:87-389`)

**Features:**
- Auto-reconnect with exponential backoff (2s → 60s max, factor 2)
- Max 10 attempts then stops
- Auth token as query param
- Subscriptions via `Map<type, Set<callback>>`
- Only connects in development (`localhost` check)

**Problems:**
1. **300+ lines in provider** — Should be extracted to `hooks/useWebSocket.ts` + `lib/websocket.ts`
2. **No connection health metrics** — No latency, message rate, queue depth
3. **Single connection** — No multiplexing, no priority channels
4. **Token in URL** — `ws://localhost:10020/ws/stream?token=...` — Logs may leak token
5. **No binary protocol** — JSON only, verbose for high-frequency telemetry

### 10.2 SSE Implementation (`providers.tsx:244-310`)

- Separate `EventSource` for `/public/stream` (traces)
- Reconnects on error with 10s delay
- No authentication (public endpoint)

### 10.3 Memory Management

| Resource | Cleanup | Risk |
|----------|---------|------|
| WebSocket | `close()` in cleanup effect | ✅ Good |
| EventSource | `close()` in cleanup effect | ✅ Good |
| Timeouts | `clearTimeout` in cleanup | ✅ Good |
| Subscriptions | `Set.delete` on unsubscribe | ✅ Good |
| Map markers (Leaflet) | **None** — recreated, old removed by cluster | ⚠️ Memory churn |
| Map layers (MapLibre) | `map.remove()` in cleanup | ✅ Good |

---

## 11. Routing

### 11.1 Route Structure

```
/                                    → IndexRoute → HomePage (SSR loader in _layout)
/intelligence                        → IntelligenceIndex (SSR loader)
/intelligence/hormuz                 → HormuzIntelligence
/intelligence/red-sea                → RedSeaIntelligence
/intelligence/suez                   → SuezIntelligence
/intelligence/persian-gulf           → PersianGulfIntelligence
/learn                               → LearnIndex
/learn/ais                           → LearnAIS
/learn/adsb                          → LearnADSB
/learn/anomaly                       → LearnAnomaly
/learn/architecture                  → LearnArchitecture
/learn/detection                     → LearnDetection
/learn/heatmaps                      → LearnHeatmaps
/learn/regional                      → LearnRegional
/learn/satellite                     → LearnSatellite
/api                                 → APIReference
/deploy                              → DeployGuide
/about                               → About
/dashboard                           → DashboardRoute (auth-gated, admin only)
```

### 11.2 Layout Hierarchy

```
RootLayout (App.tsx)
  ├─ Providers
  ├─ Router
  │   ├─ _layout.tsx (PageContainer + Navbar + Footer) → Public pages
  │   │   ├─ index.tsx
  │   │   ├─ intelligence/ (own layout: IntelligenceLayout)
  │   │   ├─ learn/ (own layout: LearnLayout + TOC)
  │   │   ├─ api.tsx
  │   │   ├─ deploy.tsx
  │   │   └─ about.tsx
  │   └─ dashboard.tsx (own auth check, no shared layout)
```

### 11.3 Routing Issues

1. **No Code Splitting** — All routes imported eagerly in `App.tsx`
2. **No Error Boundaries** — No `ErrorBoundary` or `errorElement` on routes
3. **No Loading UI** — No `Suspense` fallback for lazy routes
4. **Auth Guard Duplicated** — `DashboardRoute` does auth check inline; should be a wrapper route
5. **SSR Loaders Only on Intelligence** — Other pages use client-side `useQuery`

---

## 12. Accessibility

### 12.1 Strengths

| Feature | Implementation |
|---------|----------------|
| **Semantic HTML** | `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<footer>` |
| **ARIA Roles** | `role="dialog"`, `role="alert"`, `role="navigation"`, `role="region"` |
| **Focus Management** | `Navbar` focus trap, `BottomSheet` returns focus to trigger |
| **Keyboard Navigation** | `Escape` closes modals/sheets, `Tab` trapped in mobile menu |
| **Labels** | `aria-label` on icon buttons, `aria-labelledby` on dialogs |
| **Live Regions** | `role="alert"` on toasts, `aria-live` on metric updates |
| **Reduce Motion** | `reduceMotion` state + CSS `prefers-reduced-motion` support |

### 12.2 Gaps

| Issue | Location | Severity |
|-------|----------|----------|
| **Color contrast** | Custom CSS variables — not verified against WCAG | 🟠 Medium |
| **Map accessibility** | Leaflet/MapLibre maps are `role="application"` but no keyboard nav for markers | 🔴 High |
| **Image alt text** | No images (SVG icons inline) | ✅ N/A |
| **Form labels** | Dashboard login has `<label>` — good | ✅ Good |
| **Heading hierarchy** | `Section` component uses `level` prop — good | ✅ Good |
| **Skip link** | None | 🟡 Medium |

---

## 13. Developer Experience

### 13.1 Tooling Configuration

| Tool | Config | Status |
|------|--------|--------|
| TypeScript | `tsconfig.json` (strict, paths) | ✅ Good |
| ESLint | Not found (no `.eslintrc`) | ❌ Missing |
| Prettier | Not found | ❌ Missing |
| Vite | `vite.config.ts` (React, path aliases) | ✅ Good |
| Tailwind | `tailwind.config.js` (not found — using CSS vars) | ⚠️ Config missing |
| Git hooks | Not found | ❌ Missing |

### 13.2 Path Aliases

```json
// tsconfig.json + vite.config.ts
"@/*": ["src/*"]
```
✅ Used consistently throughout codebase

### 13.3 Barrel Exports

| File | Exports | Quality |
|------|---------|---------|
| `stores/index.ts` | 6 stores | ❌ Monolith |
| `providers.tsx` | 5 providers + `Providers` | ❌ Monolith |
| `components/ui/` | Individual files | ✅ Good |
| `lib/api.ts` | All API functions | ❌ Monolith |
| `components/maps/` | Individual files | ✅ Good |

### 13.4 Documentation

- **No README** in client-v2
- **No Storybook** or component docs
- **Inline comments** — Good in map components, stores, providers
- **Type documentation** — Excellent (TS self-documenting)

---

## 14. Code Smells

### 14.1 Smell Inventory

| Smell | Location | Severity | Evidence |
|-------|----------|----------|----------|
| **God Component** | `_layout.tsx:HomePage` | 🔴 Critical | 1,300+ lines, 15+ useState, 10+ useEffect |
| **Duplicate Implementation** | `EditorialMap` vs `LeafletMap` | 🔴 Critical | Two map libraries, two data formats |
| **Massive File** | `_layout.tsx` (1,760 lines) | 🔴 Critical | Layout + HomePage + Shared UI + Types |
| **Massive File** | `providers.tsx` (657 lines) | 🟠 High | 4 providers + WS logic |
| **Massive File** | `stores/index.ts` (751 lines) | 🟠 High | 6 stores |
| **Massive File** | `lib/api.ts` (536 lines) | 🟠 High | All endpoints |
| **Massive File** | `EditorialMap.tsx` (992 lines) | 🟠 High | Map + layers + controls + error UI |
| **Massive File** | `LeafletMap.tsx` (856 lines) | 🟠 High | Map + markers + clusters + heat + conflicts |
| **Massive File** | `MetricGrid.tsx` (850 lines) | 🟠 High | Metrics + cards + grids + live hooks + static data |
| **Long Function** | `HomePage` render (500+ lines JSX) | 🟠 High | |
| **Long Function** | `LeafletMap` tracks effect (100+ lines) | 🟠 High | |
| **Magic Numbers** | `LeafletMap` bounds, zoom levels | 🟡 Medium | Hardcoded coordinates |
| **Magic Numbers** | `MetricGrid` thresholds (warn/critical) | 🟡 Medium | Hardcoded in static metrics |
| **Hardcoded Colors** | `LeafletMap` inline styles (`#ef4444`, `#38bdf8`) | 🟡 Medium | Should use CSS variables |
| **Dead Code** | `components/charts/` (empty) | 🟡 Medium | |
| **Dead Code** | `hooks/` (empty) | 🟡 Medium | |
| **Copy/Paste** | `transformPublicMetrics` vs `transformAviationMetrics` vs `transformPlatformMetrics` | 🟡 Medium | Similar structure |
| **Deep Nesting** | `HomePage` JSX (8+ levels) | 🟡 Medium | |
| **Inconsistent Naming** | `useWebSocket` (hook) vs `WebSocketProvider` (context) | 🟡 Medium | |
| **Under-Abstraction** | No custom hooks for WS subscription, map interaction | 🟡 Medium | Logic inlined in components |
| **Over-Abstraction** | `cn` utility does everything | 🟢 Low | Acceptable |

### 14.2 Circular Dependency Risk

```
providers.tsx → stores/index.ts (via useAuthStore in fetchWithAuth)
lib/api.ts → stores/index.ts (via useAuthStore.getState())
stores/index.ts → (no import of providers or api)
```
✅ No circular deps detected, but `api.ts` calling store getter outside React context is a **code smell** (works but fragile).

---

## 15. Scalability Review

### 15.1 Scalability Assessment

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| **New Pages** | Add to `App.tsx` + route file | Lazy routes + shared layout | Manual wiring |
| **New Dashboards** | Copy `DashboardRoute` pattern | Dashboard shell + plugin tabs | High effort |
| **New Map Layers** | Edit `INTELLIGENCE_LAYERS` array | Layer registry + config | Hardcoded array |
| **New Themes** | Light-only (forced) | Dark + custom themes | Requires design token overhaul |
| **Localization** | English only | i18n ready | All strings inline |
| **Realtime Modules** | WS + SSE hardcoded | Plugin architecture | Tight coupling |
| **Plugin System** | None | Feature flags + dynamic imports | Not designed |

### 15.2 Blockers to Scaling

1. **Dual Map Stack** — Adding a new map view requires choosing library, duplicating logic
2. **God Layout File** — Any shared UI change risks breaking HomePage
3. **No Component Library** — UI primitives not published, no versioning
4. **Hardcoded Fallback Data** — 100+ lines in `_layout.tsx` — not configurable
5. **No Feature Flags** — All features always loaded

---

## 16. Maintainability Score

| Category | Score | Reasoning |
|----------|-------|-----------|
| **Architecture** | 7/10 | Good provider composition, but God files violate separation |
| **Folder Structure** | 6/10 | Logical but monolithic files, empty directories |
| **Component Design** | 6/10 | Good primitives, but pages are monoliths |
| **Type Safety** | 9/10 | Excellent TS usage, minor gaps |
| **Performance** | 5/10 | No code splitting, marker recreation, derived state in render |
| **Developer Experience** | 7/10 | Good aliases, HMR, but no linting/formatting |
| **Scalability** | 6/10 | Dual maps, hardcoded config, no plugin architecture |
| **Readability** | 7/10 | Good naming, comments in complex areas |
| **Maintainability** | 5/10 | God files, duplicate logic, mixed concerns |
| **Consistency** | 8/10 | Design tokens, naming conventions, patterns |

**Overall Grade: C+ (72/100)**

---

## 17. Technical Debt Register

| # | Issue | Severity | Location | Evidence | Why It Matters | Risk | Recommendation | Effort | Priority |
|---|-------|----------|----------|----------|----------------|------|----------------|--------|----------|
| 1 | God Component: HomePage | 🔴 Critical | `_layout.tsx:451-1761` | 1,300 lines, 15 useState, 10 useEffect | Unmaintainable, untestable, blocks changes | Regression on any edit | Split into: `HomePage`, `MapLegend`, `ThreatList`, `MetricStrip`, `MetricDetailSheet`, `SettingsSheet`, `ThreatModal`, `ToastContainer`, `ReportLoader` | 8h | P0 |
| 2 | Dual Map Stack | 🔴 Critical | `components/maps/` | MapLibre + Leaflet, different APIs | Double bundle, duplicate logic, confusion | Bundle size, maintenance | Migrate HomePage to `EditorialMap` (MapLibre), remove Leaflet | 16h | P0 |
| 3 | No Route Code Splitting | 🟠 High | `App.tsx` | All routes eager imports | 500KB+ initial bundle | Slow FCP/TTI | Add `React.lazy` + `Suspense` for all routes | 4h | P0 |
| 4 | WebSocket Logic in Provider | 🟠 High | `providers.tsx:87-389` | 300 lines reconnection/subscription | Not reusable, hard to test | Connection bugs | Extract to `hooks/useWebSocket.ts` + `lib/websocket.ts` | 6h | P1 |
| 5 | Hardcoded Fallback Data | 🟠 High | `_layout.tsx:15-112` | 100 lines static `FALLBACK` object | Not configurable, misleading | Stale UI | Move to config file or CMS | 2h | P1 |
| 6 | Duplicate Filter State | 🟠 High | `HomePage` + `IncidentStore` | `timeline`/`severityFilter`/`regionFilter` in both | Inconsistent UI, bugs | Data mismatch | Single source of truth (store or URL params) | 4h | P1 |
| 7 | LeafletMap Marker Recreation | 🟠 High | `LeafletMap.tsx:338-374` | Creates ALL markers on every filter/track change | Memory churn, jank | Poor UX | Diff markers, reuse, or migrate to MapLibre | 8h | P1 |
| 8 | No Error Boundaries | 🟠 High | Entire app | No `ErrorBoundary` or `errorElement` | White screen on error | Production crashes | Add route-level `errorElement` + root `ErrorBoundary` | 4h | P1 |
| 9 | Stores Monolith | 🟡 Medium | `stores/index.ts` | 751 lines, 6 stores | Tree-shaking blocked, ownership unclear | Bundle size | Split to `uiStore.ts`, `mapStore.ts`, etc. | 3h | P2 |
| 10 | Providers Monolith | 🟡 Medium | `providers.tsx` | 657 lines, 4 providers | Hard to navigate | Maintenance | Split files, keep `Providers` composition | 2h | P2 |
| 11 | API Client Monolith | 🟡 Medium | `lib/api.ts` | 536 lines, all endpoints | Hard to navigate | Maintenance | Split by domain: `public.ts`, `auth.ts`, `admin.ts`, `datasets.ts`, `ws.ts` | 3h | P2 |
| 12 | MetricStore Duplicates Query | 🟡 Medium | `stores/index.ts` + `MetricGrid.tsx` | `useQuery` + `MetricStore` for same data | Inconsistent state | Bugs | Unify: use Query for all, WS updates Query cache | 4h | P2 |
| 13 | MapStore Holds mapInstance | 🟡 Medium | `stores/index.ts:244` | `mapInstance: MapLibreMap \| null` | Non-serializable, couples store to lib | Testing, persistence | Remove from store, use ref in component | 2h | P2 |
| 14 | No Testing Infrastructure | 🟡 Medium | Root | No vitest, no playwright, no test files | No regression safety | Regressions | Add vitest + React Testing Library + Playwright | 8h | P2 |
| 15 | No Linting/Formatting | 🟡 Medium | Root | No ESLint/Prettier config | Inconsistent style | Review friction | Add ESLint + Prettier + Husky | 2h | P2 |
| 16 | Empty Directories | 🟢 Low | `hooks/`, `components/charts/` | Exist but empty | Confusion | Developer confusion | Remove or populate | 0.5h | P3 |
| 17 | Inline Styles in LeafletMap | 🟢 Low | `LeafletMap.tsx` | `style={{ color: '#ef4444' }}` | Breaks design system | Theming issues | Use CSS variables | 2h | P3 |
| 18 | Token in WS URL | 🟢 Low | `providers.tsx:80` | `url.searchParams.set('token', token)` | Token in logs | Security | Use WS protocol auth or header | 2h | P3 |

---

## 18. Refactoring Roadmap

### Phase 1 — Quick Wins (Week 1-2)
**Goal:** Reduce bundle, improve DX, remove obvious debt

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Add route code splitting (`React.lazy`) | P0 | `App.tsx`, all routes | -40% initial bundle | Low (SSR loaders unaffected) | 4h |
| Add ESLint + Prettier + Husky | P2 | Root config | Consistent style, catch bugs | Low | 2h |
| Remove empty directories | P3 | `hooks/`, `components/charts/` | Clean structure | None | 0.5h |
| Move `FALLBACK` data to config file | P1 | `_layout.tsx`, new `config/fallback.ts` | Configurable, removable | Low | 2h |
| Add root ErrorBoundary + route errorElements | P1 | `App.tsx`, `main.tsx` | Prevent white screens | Low | 4h |

### Phase 2 — Architecture Cleanup (Week 3-4)
**Goal:** Split monoliths, establish patterns

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Split `stores/index.ts` into 6 files | P2 | `stores/*.ts`, imports | Tree-shaking, ownership | Medium (update imports) | 3h |
| Split `providers.tsx` into 4 files | P2 | `providers/*.tsx`, `providers.tsx` | Navigability, testing | Medium | 2h |
| Split `lib/api.ts` by domain | P2 | `lib/api/*.ts`, imports | Navigability, testing | Medium | 3h |
| Extract `useWebSocket` hook | P1 | `hooks/useWebSocket.ts`, `providers.tsx` | Reusability, testing | Medium | 6h |
| Remove `mapInstance` from MapStore | P2 | `stores/mapStore.ts`, `EditorialMap.tsx` | Serialization, decoupling | Low | 2h |

### Phase 3 — HomePage Decomposition (Week 5-6)
**Goal:** Eliminate God Component

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Create `HomePage.tsx` page component | P0 | New file, `_layout.tsx` | Isolation | High (large move) | 4h |
| Extract `MapLegend` component | P0 | New `components/map/MapLegend.tsx` | Reuse, testability | Medium | 3h |
| Extract `ThreatList` component | P0 | New `components/intelligence/ThreatList.tsx` | Reuse on intelligence pages | Medium | 4h |
| Extract `MetricStrip` + `MetricDetailSheet` | P0 | New `components/data/MetricStrip.tsx` | Reuse, isolation | Medium | 4h |
| Extract `SettingsSheet` | P0 | New `components/ui/SettingsSheet.tsx` | Reuse | Low | 2h |
| Extract `ThreatDetailModal` | P0 | New `components/intelligence/ThreatModal.tsx` | Reuse | Medium | 3h |
| Extract `ToastContainer` | P0 | New `components/ui/ToastContainer.tsx` | Reuse, portal | Low | 2h |
| Extract `ReportLoaderOverlay` | P0 | New `components/ui/ReportLoader.tsx` | Reuse | Low | 2h |

### Phase 4 — Map Unification (Week 7-8)
**Goal:** Single map library

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Migrate HomePage to `EditorialMap` | P0 | `HomePage.tsx`, `EditorialMap.tsx` | -140KB bundle, single API | High (behavior differences) | 12h |
| Remove Leaflet dependencies | P0 | `package.json`, `LeafletMap.tsx` | Bundle size | Low (after migration) | 2h |
| Extract `MapLayerConfig` to shared config | P2 | `components/maps/layers.ts` | Config-driven layers | Low | 3h |
| Add layer registry pattern | P2 | `components/maps/LayerRegistry.ts` | Plugin architecture | Medium | 4h |

### Phase 5 — State Management Cleanup (Week 9)
**Goal:** Unify server/client state, fix duplicates

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Unify filter state (URL params) | P1 | `HomePage.tsx`, `IncidentStore`, router | Single source, shareable URLs | Medium | 4h |
| Merge MetricStore into TanStack Query | P2 | `stores/metricStore.ts`, `MetricGrid.tsx` | Single source, cache deduping | Medium | 4h |
| Add persist middleware to SettingsStore | P2 | `stores/settingsStore.ts` | Cleaner persistence | Low | 2h |
| Add Immer middleware to all stores | P2 | `stores/*.ts` | Consistency (already used) | Low | 1h |

### Phase 6 — Styling Cleanup (Week 10)
**Goal:** Design system maturity

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Add dark mode tokens + implementation | P3 | `index.css`, `ThemeProvider` | User preference | Medium | 8h |
| Audit contrast ratios | P3 | `index.css` | Accessibility | Low | 4h |
| Document design tokens | P3 | New `DESIGN_TOKENS.md` | Onboarding | None | 2h |
| Replace inline styles in LeafletMap | P3 | `LeafletMap.tsx` (if not removed) | Theming | Low | 2h |

### Phase 7 — Performance Optimization (Week 11-12)
**Goal:** Production-ready performance

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Virtualize threat lists | P1 | `ThreatList.tsx`, `HomePage.tsx` | Handle 1000+ items | Low | 4h |
| Memoize derived state (`useMemo`) | P1 | `HomePage.tsx`, `EditorialMap.tsx` | Reduce render cost | Low | 3h |
| Add `React.memo` to `SparklineChart`, `MetricCard` | P1 | `MetricGrid.tsx` | Prevent re-renders | Low | 2h |
| Implement marker diffing in MapLibre | P2 | `EditorialMap.tsx` | Smooth updates | Medium | 6h |
| Add bundle analyzer + budgets | P2 | `vite.config.ts`, CI | Prevent regression | Low | 3h |

### Phase 8 — Final Polish (Week 13)
**Goal:** Testing, documentation, hardening

| Task | Priority | Files Affected | Benefit | Risk | Effort |
|------|----------|----------------|---------|------|--------|
| Add vitest + React Testing Library | P2 | New `*.test.tsx` files | Regression safety | Medium | 8h |
| Add Playwright E2E tests | P2 | New `e2e/` | User flow validation | Medium | 8h |
| Document component APIs | P3 | New `docs/components/` | Onboarding | None | 4h |
| Add CI pipeline (lint, typecheck, test) | P2 | `.github/workflows/` | Automation | Low | 4h |

---

## 19. Safe Refactoring Strategy

### For Each Major Change:

| Change | Justification | Possible Regressions | Testing Strategy | Rollback Strategy |
|--------|---------------|---------------------|------------------|-------------------|
| **Route Code Splitting** | Bundle size | SSR loader timing, Suspense fallback flash | Compare Lighthouse before/after; test all routes manually | Revert `App.tsx` imports |
| **HomePage Decomposition** | Maintainability | Lost state (open sheets, filters), broken layout | Storybook visual tests; manual QA checklist for each extracted component | Feature flag: `VITE_LEGACY_HOMEPAGE=1` renders old `_layout` |
| **Map Migration (Leaflet→MapLibre)** | Bundle, consistency | Different zoom/pan behavior, missing heatmap, cluster diff | Side-by-side visual comparison; automated pixel diff on map screenshots | Keep `LeafletMap` behind flag until parity |
| **Store Splitting** | Tree-shaking, ownership | Import path errors, circular deps | TypeScript compile check; unit tests per store | Git revert |
| **WS Hook Extraction** | Reusability, testing | Connection timing changes, subscription leaks | Integration test with mock WS server; memory profiling | Keep provider as fallback |
| **Filter State Unification** | Consistency | URL pollution, back-button behavior | Test deep-linking, browser back/forward, refresh | URL params optional (fallback to store) |

### General Safety Rules:
1. **One phase at a time** — Complete Phase 1 before Phase 2
2. **Feature flags for risky migrations** — `VITE_USE_MAPLIBRE_HOME`, `VITE_LEGACY_HOMEPAGE`
3. **Visual regression testing** — Add Playwright screenshots for map, homepage, dashboard
4. **Bundle size budgets** — `vite-plugin-bundle-analyzer` + CI check (< 200KB gzipped initial)
5. **TypeScript strict mode** — Never disable, fix errors instead

---

*End of Analysis Document*