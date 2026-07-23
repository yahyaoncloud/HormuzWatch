# Performance & Bundle Optimization Strategy

## Code Splitting & Chunking
- **Route Modules**: React Router v8 Framework Mode automatically splits every route file in `src/app/routes/` into isolated JavaScript chunks.
- **Heavy UI Libraries**: `maplibre-gl`, `leaflet`, `uplot`, and `framer-motion` are configured in `vite.config.ts` under `optimizeDeps` for efficient bundling and async loading.

## Render Optimization
- **Map Layer Memoization**: Map canvas elements render inside dedicated canvas contexts without re-mounting during layout transitions.
- **URL Parameter Sync**: Navigation tabs and search filters sync via `useSearchParams`, eliminating unnecessary global context renders.
- **Font & CSS Optimization**: Fonts preload via Google Fonts display-swap links; CSS code splitting enabled via `@tailwindcss/vite`.
