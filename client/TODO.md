# HormuzWatch Client — Master Refactoring Roadmap & Architecture Plan

> **Standard:** Production-Grade Modern React 19 + TypeScript SPA  
> **Design Methodology:** Atomic & Molecular Component Architecture  
> **Styling Framework:** Tailwind CSS with Strict Design Tokens & Theme Variables  
> **State Management:** Modular Domain-Driven Zustand Slices  

---

## 1. Executive Summary & Codebase Audit Findings

### 1.1 Key Deficiencies in Legacy Code
1. **Monolithic Store Monolith (`client/src/stores/index.ts` - 783 lines)**:
   - 7 unrelated stores (`UIStore`, `MapStore`, `RealtimeStore`, `IncidentStore`, `AdminStore`, `NotificationStore`, `SettingsStore`) lumped into one file.
   - Bypassed in route components (`home.tsx`) in favor of 15+ local `useState` hooks and manual `localStorage` synchronizations.
2. **High JSX Duplication in Route & Panel Components**:
   - `HomeTopBar.tsx` repeated 6 consecutive blocks of identical ~35-line HUD popup JSX.
   - Route pages (`home.tsx`, `admin/*.tsx`, `public/learn/*.tsx`) contain massive blocks of manual raw HTML/JSX rather than composed reusable molecules.
3. **Violations of Single Responsibility Principle (SRP)**:
   - `useHomeTelemetry.ts` combined REST polling, WebSocket streaming, track deduplication, synthetic math aggregation, and UI log string formatting in a 430-line hook.
4. **Theme Inconsistency & Manual Inline Styling**:
   - Ad-hoc Tailwind utility classes and hardcoded colors (`bg-[#121820]`, `text-[#00ffcc]`) bypass CSS variables (`var(--color-bg)`, `var(--color-fg)`, `var(--color-border)`), breaking dark/light mode parity.
5. **Scattered Types & Missing Centralized API Layer**:
   - Types duplicated between `lib/api.ts`, `stores/index.ts`, route files, and hook files.
   - Lack of unified query keys factory and API client interceptors.

---

## 2. Molecular / Atomic Component Hierarchy

```
client/src/
├── components/
│   ├── common/                          # [ATOMS & PRIMITIVES]
│   │   ├── StatusIndicator.tsx          # Status dot/pill with pulse/ping animation variants
│   │   ├── Button.tsx                   # Themed button (primary, secondary, danger, ghost)
│   │   ├── Badge.tsx                    # Monospace pill badge (severity, category)
│   │   ├── Card.tsx                     # Themed surface card with border and shadow
│   │   ├── Modal.tsx                    # Accessible dialog/overlay
│   │   └── HoverLogCard.tsx             # Generic tactical hover terminal popup
│   │
│   ├── molecules/                       # [MOLECULES: Composed UI building blocks]
│   │   ├── MetricCard.tsx               # Metric KPI card with sparklines, diffs, and units
│   │   ├── HudMetricBadge.tsx           # Status badge + live value + HoverLogCard popup
│   │   ├── LayerToggleGroup.tsx         # Segmented layer toggles (Vessels, Aircraft, Conflicts, Areas)
│   │   ├── FilterSelect.tsx             # Themed select dropdown for regions and severities
│   │   ├── TimelineSegment.tsx          # Segmented 1hr/6hr/24hr time range switcher
│   │   ├── ThreatListItem.tsx           # Threat list row with score badge and timestamp
│   │   └── SearchBar.tsx                # Debounced search input with clear button
│   │
│   ├── organisms/                       # [ORGANISMS: Domain containers & layouts]
│   │   ├── home/
│   │   │   ├── HomeTopBar.tsx           # Lean top navigation container (~90 lines)
│   │   │   ├── HomePanels.tsx           # Split layout with responsive drag handles
│   │   │   └── IntelligenceConsole.tsx  # Left news & sector intelligence feed
│   │   ├── data/
│   │   │   ├── LiveStatStrip.tsx        # Floating bottom HUD metrics strip
│   │   │   └── MetricGrid.tsx           # Responsive metric grid container
│   │   └── maps/
│   │       ├── LeafletMap.tsx           # Lazy client map wrapper
│   │       └── LeafletMapInner.tsx      # Tactical Leaflet map engine (ESRI Basemaps & Layers)
│   │
│   └── templates/ & routes/             # [TEMPLATES & PAGES]
│       └── app/routes/public/home.tsx   # Declarative composition of HomeTopBar + HomePanels
```

---

## 3. Strict Theme & Design Token Guidelines

### 3.1 CSS Design Token Mapping
All UI components **MUST** use theme CSS variables defined in `globals.css`:
- **Backgrounds**: `bg-[var(--color-bg)]`, `bg-[var(--color-bg-elevated)]`, `bg-[var(--color-bg-card)]`
- **Borders**: `border-[var(--color-border)]`, `border-[var(--color-border-strong)]`, `border-[var(--color-primary-600)]`
- **Typography**:
  - Headings & Branding: `font-display` (`Share Tech`)
  - User Interface: `font-ui` (`Inter`)
  - Data, Telemetry & Logs: `font-mono` / `font-data` (`JetBrains Mono`)
- **Foregrounds**: `text-[var(--color-fg)]`, `text-[var(--color-fg-muted)]`, `text-[var(--color-fg-subtle)]`
- **Semantic Accents**:
  - Primary / Brand: `text-[var(--color-primary-400)]` / `bg-[var(--color-primary-600)]`
  - Success / Normal: `text-emerald-400` / `bg-emerald-500`
  - Warning / Elevated: `text-amber-400` / `bg-amber-500`
  - Danger / Critical: `text-rose-400` / `bg-rose-600`
  - Aviation Airspace: `text-sky-400` / `bg-sky-500`
  - WebSocket Streaming: `text-purple-400` / `bg-purple-500`
  - Geopolitical News: `text-indigo-400` / `bg-indigo-500`

---

## 4. State Management: Modular Domain Slices

```
client/src/stores/
├── index.ts                             # Unified barrel export
└── slices/
    ├── map.store.ts                     # Layer toggles, filters, timeline, recenter (Persisted)
    ├── health.store.ts                  # Live /health audits, DB latency, ML circuit breaker, HUD logs
    ├── telemetry.store.ts               # Active traces map, real-time anomalies, AIS/ADS-B cache
    ├── ui.store.ts                      # Modals, sidebars, toast notifications, mobile viewport
    └── settings.store.ts                # User preferences, tile providers, refresh intervals
```

---

## 5. Canonical Type System (`client/src/types/`)

```
client/src/types/
├── index.ts                             # Barrel export
├── telemetry.ts                         # VesselTrack, AircraftTrack, AnomalyEvaluation, StrategicWatchZone
├── health.ts                            # SystemHealthState, DatabaseHealth, MLServiceHealth, SystemMetricLogs
├── metrics.ts                           # PublicMetricsState, MetricKey, MetricCardConfig
├── threats.ts                           # ThreatItem, ThreatSeverity, ThreatCluster
├── websocket.ts                         # WSMessage, TelemetryPayload, AnomalyPayload, StatsPayload
└── api.ts                               # APIResponse<T>, PaginatedResponse<T>, ErrorResponse
```

---

## 6. Actionable Master Implementation Checklist

### Phase 1: Canonical Types & Molecular UI Primitives (Done / In Progress)
- [x] **1.1 Canonical Types**:
  - [x] Created `types/telemetry.ts` (`VesselTrack`, `AircraftTrack`, `AnomalyEvaluation`, `StrategicWatchZone`).
  - [x] Created `types/health.ts` (`SystemHealthState`, `DatabaseHealth`, `MLServiceHealth`, `SystemMetricLogs`, `MetricLogEntry`).
  - [x] Created `types/metrics.ts` (`PublicMetricsState`, `MetricKey`, `MetricCardConfig`).
- [x] **1.2 Atomic & Molecular Components**:
  - [x] Created `components/common/StatusIndicator.tsx` (Atom with size and pulse/ping variants).
  - [x] Created `components/common/HoverLogCard.tsx` (Molecule with dark monospace tactical styling).
  - [x] Created `components/home/HudMetricBadge.tsx` (Molecule combining status, value, and log popover).
  - [x] Created `components/home/LayerToggleGroup.tsx` (Molecule for Vessels, Aircraft, Conflicts, Areas).
- [x] **1.3 Modular Store Slices**:
  - [x] Created `stores/slices/map.store.ts` (Persisted map layer visibility, filters, and timeline).
  - [x] Created `stores/slices/health.store.ts` (Live health telemetry and latest HUD log events).
  - [x] Re-exported slices through `stores/index.ts`.
- [x] **1.4 Refactor `HomeTopBar.tsx`**:
  - [x] Replaced 450 lines of duplicate JSX with declarative `<HudMetricBadge />` and `<LayerToggleGroup />`.

---

### Phase 2: Telemetry Ingestion & Route Cleanup
- [ ] **2.1 Decouple `useHomeTelemetry.ts`**:
  - [ ] Extract `hooks/useSystemHealth.ts` for `/health` polling.
  - [ ] Extract `hooks/useLiveTelemetry.ts` for WebSocket event ingestion.
  - [ ] Push ingested updates into `stores/slices/telemetry.store.ts` and `stores/slices/health.store.ts`.
- [ ] **2.2 Eliminate Prop Drilling in `home.tsx` & `HomePanels.tsx`**:
  - [ ] Connect `LeafletMapInner.tsx` directly to `useMapStateStore`.
  - [ ] Remove redundant local `useState` variables in `home.tsx` for `showVessels`, `showAircraft`, `showConflicts`, `showAreas`, `showHeatmap`, `showMetrics`.
- [ ] **2.3 Refactor `LiveStatStrip.tsx` & `HomePanels.tsx`**:
  - [ ] Replace inline metric cards with `<MetricCard />` molecule.

---

### Phase 3: Centralized API Client & Query Management
- [ ] **3.1 Centralized API Client (`client/src/lib/api/`)**:
  - [ ] Create `lib/api/client.ts`: Unified Axios/Fetch client with environment base URL, timeout, and auth interceptors.
  - [ ] Create `lib/api/keys.ts`: Centralized Query Key Factory (`queryKeys.health.status()`, `queryKeys.telemetry.traces()`, `queryKeys.news.list()`).
  - [ ] Create `lib/api/endpoints/`: Domain modules for `telemetry.api.ts`, `health.api.ts`, `news.api.ts`, `threats.api.ts`.
- [ ] **3.2 Type Cleanup in `lib/api.ts`**:
  - [ ] Re-export canonical types from `types/` and remove duplicate interfaces.

---

### Phase 4: Admin & Learn Route Molecular Refactoring
- [ ] **4.1 Admin Pages Modernization (`app/routes/admin/*.tsx`)**:
  - [ ] Replace manual raw HTML tables with reusable `<DataTable />` organism.
  - [ ] Standardize KPI counters using `<KPICard />` molecule.
  - [ ] Ensure strict design token usage (`var(--color-bg-card)`, `var(--color-border)`).
- [ ] **4.2 Learn Section Modernization (`app/routes/public/learn/*.tsx`)**:
  - [ ] Replace inline markdown styling with centralized `<ProseBlock />` and `<DocumentationBlock />` molecules.

---

### Phase 5: Dead Code & Legacy Pruning
- [ ] **5.1 Dead Code Elimination**:
  - [ ] Remove unused components in `components/ui/` (e.g. `PageTodoList.tsx` if obsolete).
  - [ ] Remove obsolete manual store files.
  - [ ] Remove unused legacy utility functions in `utils/`.
- [ ] **5.2 Automated Lint & Bundle Audit**:
  - [ ] Run `npm run build` and `tsc --noEmit` to verify zero errors.
  - [ ] Validate chunk sizes and dynamic imports.
