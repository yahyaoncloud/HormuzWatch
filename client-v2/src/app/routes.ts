import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // ── Auth routes (standalone, no layout wrapping) ──────────────
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),

  // ── Admin routes (all under /admin) ───────────────────────────
  route("admin", "routes/admin/layout.tsx", [
    index("routes/admin/dashboard.tsx"),
    route("news", "routes/admin/news.tsx"),
    route("sources", "routes/admin/sources.tsx"),
    route("events", "routes/admin/events.tsx"),
    route("threats", "routes/admin/threats.tsx"),
    route("users", "routes/admin/users.tsx"),
    route("settings", "routes/admin/settings.tsx"),
    route("datasets", "routes/admin/datasets.tsx"),
    route("profile", "routes/admin/profile.tsx"),
    route("audit", "routes/admin/audit.tsx"),
    route("tracking", "routes/admin/tracking.tsx"),
    route("watchlist", "routes/admin/watchlist.tsx"),
    route("analytics", "routes/admin/analytics.tsx"),
  ]),

  // ── Public routes (root level — / is home) ───────────────────
  layout("routes/public/layout.tsx", [
    index("routes/public/home.tsx"),
    route("intelligence", "routes/public/intelligence/index.tsx"),
    route("intelligence/:region", "routes/public/intelligence/region.tsx"),
    layout("routes/learn-layout.tsx", [
      route("learn", "routes/public/learn/index.tsx"),
      route("learn/satellite", "routes/public/learn/satellite.tsx"),
      route("learn/regional", "routes/public/learn/regional.tsx"),
      route("learn/anomaly", "routes/public/learn/anomaly.tsx"),
      route("learn/heatmaps", "routes/public/learn/heatmaps.tsx"),
      route("learn/adsb", "routes/public/learn/adsb.tsx"),
      route("learn/ais", "routes/public/learn/ais.tsx"),
      route("learn/architecture", "routes/public/learn/architecture.tsx"),
      route("learn/detection", "routes/public/learn/detection.tsx"),
    ]),
    route("api", "routes/public/api.tsx"),
    route("research", "routes/public/research.tsx"),
    route("deploy", "routes/public/deploy.tsx"),
    route("about", "routes/public/about.tsx"),
  ]),

  // Catch-all 404
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
