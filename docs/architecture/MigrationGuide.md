# Developer Migration Guide: Legacy Data Mode to React Router v8 Framework Mode

## Overview
This guide documents the changes made to convert `client-v2` from a legacy Data Mode SPA (`createBrowserRouter` in `src/App.tsx`) to **React Router v8 Framework Mode**.

## Key Steps Completed

1. **Entry Point Modernization**:
   - `index.html` updated to load `/src/app/entry.client.tsx`.
   - `src/app/entry.client.tsx` updated to use `HydratedRouter` from `react-router`.
   - `src/app/root.tsx` updated to wrap `<Outlet />` with `QueryClientProvider`, `Providers`, `Toaster`, and theme utilities.

2. **Route Loaders & Data Loading**:
   - Added export `loader` functions to route modules (`home.tsx`, `dashboard.tsx`).
   - Integrated `useLoaderData()` with `@tanstack/react-query` `initialData` to provide instant rendering without initial loading spinners.

3. **URL-Driven State**:
   - Tab switching in `dashboard.tsx` migrated from component state (`useState`) to URL search parameters (`useSearchParams`).

4. **Authorization & Navigation**:
   - Replaced render-time `navigate()` side-effects with clean `useEffect` guards and loader-level session checks.

5. **Documentation**:
   - Standardized 10 architectural reference documents generated under `docs/architecture/`.
