# HormuzShield — End-to-End Implementation TODO (Phased)

This file outlines an end-to-end, phased plan to implement the requested UX, map, realtime telemetry and documentation work.

PHASE 0 — Planning & Design

- 0.1 Create design brief: minimalist cyber-security themed dark UI, fonts, color tokens, iconography.
- 0.2 Select typography (web-safe + variable font) and license-check.
- 0.3 Prepare visual assets: logo, map marker styles, heartbeat animation sketches.

PHASE 1 — Documentation & Onboarding

- 1.1 Add `CONTRIBUTING.md` with PR, code style, commit message, branch policy.
- 1.2 Add `CREATED_BY.md` (or section in README) listing authors, roles, contacts.
- 1.3 Update README with quick-start for dark theme, simulator, and realtime flow.

PHASE 2 — Theming & Base Layout

- 2.1 Implement a dark theme base (CSS variables / Tailwind config): background, surface, accents, success/warn/critical.
- 2.2 Add cyber-security minimalist skin: monospaced-ish headings, angular accents, subtle grid.
- 2.3 Integrate chosen font (variable font) via `@font-face` or Google/hosted provider.
- 2.4 Create a theme toggle and persist choice in `localStorage`.

PHASE 3 — Map Console Core

- 3.1 Replace or extend existing `HormuzMap` with MapLibre/Leaflet layer support (vector tiles optional).
- 3.2 Lock map to region center and implement geofence: restrict pan/drag to a 1000 km radius (or ~1000 km^2 bounding constraint) and limit max zoom out.
- 3.3 Add map configuration: minZoom/maxZoom, maxBounds implementation to clamp view.
- 3.4 Add category-based quick zoom buttons on the console (ships / aircraft / missiles / incidents).
- 3.5 Provide keyboard shortcuts and UI buttons for zoom in/out and category jumps.

PHASE 4 — UX & Layout Refinement

- 4.1 Redefine card layouts: compact, two-tier cards for metrics, alerts, and entity details.
- 4.2 Expand the map console: responsive layout where map takes priority on larger screens.
- 4.3 Create a compact watch-mode with collapsed sidebars and live map focus.

PHASE 5 — Internationalization & Arabic Support

- 5.1 Add i18n scaffolding (i18next or lightweight alternative).
- 5.2 Add Arabic translations for key UI strings and support RTL layout flip.
- 5.3 Verify fonts render Arabic and adjust typography scale.

PHASE 6 — Realtime Data & APIs

- 6.1 Define realtime ingestion architecture: SSE/WebSocket gateway -> validation -> broadcast to UI.
- 6.2 Integrate ships tracking APIs (AIS providers or simulated feeds) and normalize schema.
- 6.3 Integrate aircraft tracking APIs (OpenSky, ADS-B aggregators) with rate-limits.
- 6.4 Integrate missile/incident tracking feeds (if available from public sources) or simulate.
- 6.5 Add top-news API integration (newsapi.org, GDELT, or other feeds) with geo-filtering on conflict keywords.

PHASE 7 — Realtime Visuals & Metrics

- 7.1 Implement realtime heartbeats (pulsing circles) at conflict locations with decay and intensity based on activity frequency.
- 7.2 Add live metric panels: tracked ships, tracked aircraft, missile events, ingestion rate, anomalies/sec.
- 7.3 Implement category-based layers toggle (ships/aircraft/missiles/news) with cluster/heatmap options.

PHASE 8 — Simulation & Local Testing

- 8.1 Extend `simulate-local.js` to include simulated aircraft and missile events and top-news mock events.
- 8.2 Add a test harness to replay recorded scenarios at controllable speed.
- 8.3 Add unit tests and smoke tests for telemetry ingestion and map rendering.

PHASE 9 — Security & Hardening

- 9.1 Harden APIs: auth (JWT / API keys), input validation (Zod), rate-limits, CORS policy.
- 9.2 Add audit logging for ingestion sources and operator actions.
- 9.3 Sanitize third-party content (news HTML), validate external links.

PHASE 10 — Performance & Observability

- 10.1 Instrument metrics (Prometheus/OpenTelemetry) for ingestion latency, UI WS throughput, render FPS.
- 10.2 Add back-pressure handling for spikes and graceful degradation (throttle visual updates).

PHASE 11 — CI/CD, Deploy & Runbooks

- 11.1 Add pipeline steps to build assets, run tests, and deploy static UI + API to chosen infra (SWA, App Service, AKS).
- 11.2 Provide environment matrix and secrets guidance in `docs/`.
- 11.3 Produce runbooks for operations (how to start/stop simulator, rotate keys, recover state).

PHASE 12 — Finalization

- 12.1 Accessibility audit and remediation (contrast, keyboard nav, ARIA labels).
- 12.2 Final UX polish, translation review, and documentation completion.
- 12.3 Prepare release notes and contributor guide.

---

Notes & Implementation hints

- Geofence: implement using `map.setMaxBounds()` (Leaflet/MapLibre) or compute great-circle distance from center and clamp user pan events.
- Heartbeat visuals: use WebGL layer or canvas overlay for performance (e.g., deck.gl, mapbox-gl layer, or an animated canvas tied to map transforms).
- Arabic/RTL: use CSS direction and `dir="rtl"` on root for Arabic pages; ensure mirrored layout for nav/control placements.
- Top news: subscribe to news API with query terms and location bounding box; normalize to `{title, source, url, publishedAt, lat?, lon?}`.
- Realtime ingestion: keep schema stable (use `zod`) and broadcast via SSE or WebSocket to clients.

If you want I can now:

- scaffold the `TODO.md` as file (done),
- create `CONTRIBUTING.md` and `CREATED_BY.md` templates next,
- start Phase 2: implement the dark theme CSS variables and font integration.

Which next phase should I begin implementing?
