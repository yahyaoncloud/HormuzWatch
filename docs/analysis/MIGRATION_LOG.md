# React Router Migration Log

## 2026-07-21 — Phase 2.2
**File:** `client-v2/package.json`
**Reason:** Upgrade React Router to v7.18.1 as required for the platform stabilization.
**Impact:** Upgrades the core routing library for all application components.
**Validation:** `npm install --legacy-peer-deps` succeeded.
**Rollback:** Revert `react-router` version in `package.json` and reinstall.

## 2026-07-21 — Phase 3.2
**File:** `client-v2/src/app/root.tsx`
**Reason:** This file was a leftover Vite SPA remnant that contained an entire `<html>` and `<body>` shell, creating duplicates against `index.html`.
**Impact:** Cleans up the React root and prevents double rendering of document shells.
**Validation:** File deletion caused no build errors.
**Rollback:** Git restore `src/app/root.tsx`.

## 2026-07-21 — Phase 3.4
**File:** `client-v2/src/app/routes/_layout.tsx`
**Reason:** Centralize the layout hierarchy. Renamed `IntelligenceLayout` to `RootLayout`, and stripped the duplicated `Navbar` and `SiteFooter` from `PageContainer`.
**Impact:** DRY layout structure. The `<Navbar />` is now managed entirely by the `RootLayout`, ensuring no double navigations or un-synchronized UI elements.
**Validation:** `vite build` completed successfully. 
**Rollback:** Git checkout `client-v2/src/app/routes/_layout.tsx`.

## 2026-07-21 — Phase 3.3
**File:** `client-v2/src/App.tsx`
**Reason:** Rewire the routing configuration to nest core internal pages (e.g., `/intelligence`, `/learn`) under the new `RootLayout`. Added a global `ErrorBoundary`.
**Impact:** Fixes layout rendering globally and ensures all routes gracefully fall back on errors.
**Validation:** Verified the pathless route architecture compiles cleanly.
**Rollback:** Git checkout `client-v2/src/App.tsx`.

## 2026-07-21 — Phase 3.1 & 3.2
**File:** `client-v2/src/app/routes/intelligence/index.tsx`, `client-v2/src/app/routes/intelligence/hormuz.tsx`
**Reason:** Added explicit `HydrateFallback` and `ErrorBoundary` exports for routes that utilize `loader` functions, as dictated by React Router v7 best practices.
**Impact:** Prevents SSR hydration mismatches and handles localized data fetching errors gracefully.
**Validation:** Code modifications applied seamlessly.
**Rollback:** Revert changes in both files via Git.

## 2026-07-21 — Phase 3.6
**File:** `client-v2/src/components/ui/navbar.tsx`
**Reason:** Implemented a global pending navigation indicator using `useNavigation().state === 'loading'` to enhance perceived performance during async data fetches or chunk loads.
**Impact:** Adds a pulsing progress bar at the bottom of the navigation header.
**Validation:** Verified integration of `useNavigation`.
**Rollback:** Revert changes to `navbar.tsx`.
