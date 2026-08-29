/**
 * environment.ts — Single source of truth for all frontend configuration.
 *
 * Every URL, credential reference, feature flag, and admin setting lives here.
 * No other file should read import.meta.env.VITE_* directly or contain
 * hardcoded fallback URLs / emails.
 *
 * Usage:
 *   import { env } from "@/environments/environment";
 *   const client = createClient(env.supabase.url, env.supabase.anonKey);
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const bool = (v: string | undefined, fallback: boolean): boolean => {
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
};

const num = (v: string | undefined, fallback: number): number => {
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
};

// ---------------------------------------------------------------------------
// Environment singleton
// ---------------------------------------------------------------------------

export const env = {
  // ── Runtime mode ──────────────────────────────────────────────────
  /** True when running via `vite dev`. */
  isDev: import.meta.env.DEV,
  /** True in production build. */
  isProd: import.meta.env.PROD,
  /** True during SSR render pass. */
  isSSR: typeof window === "undefined",
  /** Build mode ("development" | "production"). */
  mode: import.meta.env.MODE as string,

  // ── Go backend API ────────────────────────────────────────────────
  api: {
    /** REST API base URL (no trailing slash). */
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:10020",
    /** Request timeout in milliseconds. */
    timeoutMs: num(import.meta.env.VITE_API_TIMEOUT_MS, 5000),
  },

  // ── ML / Analysis Service ─────────────────────────────────────────
  /** Python ML service URL (used by analysis charts page). */
  mlServiceUrl: import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:8090",

  // ── WebSocket ─────────────────────────────────────────────────────
  ws: {
    /** Telemetry WebSocket endpoint. */
    telemetryUrl:
      import.meta.env.VITE_WS_TELEMETRY_URL ||
      "ws://localhost:10020/ws/stream",
    /** Reconnect backoff floor (ms). */
    reconnectInitialMs: num(
      import.meta.env.VITE_WS_RECONNECT_INITIAL_MS,
      1000,
    ),
    /** Reconnect backoff ceiling (ms). */
    reconnectMaxMs: num(import.meta.env.VITE_WS_RECONNECT_MAX_MS, 30000),
    /** Max reconnect attempts before giving up. */
    maxReconnectAttempts: num(
      import.meta.env.VITE_WS_MAX_RECONNECT,
      10,
    ),
  },

  // ── Server-Sent Events ────────────────────────────────────────────
  sse: {
    /** Public SSE traces stream. */
    tracesUrl:
      import.meta.env.VITE_SSE_TRACES_URL ||
      "http://localhost:10020/public/stream",
    /** Reconnect delay (ms). */
    reconnectDelayMs: num(import.meta.env.VITE_SSE_RECONNECT_MS, 3000),
  },

  // ── Supabase ──────────────────────────────────────────────────────
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },

  // ── Auth / Admin ──────────────────────────────────────────────────
  auth: {
    /** Exact emails allowed for admin registration. */
    adminEmails: [
      "ykinwork1@gmail.com",
    ] as readonly string[],
    /** Regex pattern for admin email domains (applied case-insensitively). */
    adminEmailPattern: /^yk.*@.*\.com$/i,
    /** Email used by the UI guard screens for display only (never for logic). */
    adminDisplayEmail: "ykinwork1@gmail.com",
    /** Secret used for admin session signing. */
    sessionSecret: (import.meta.env.VITE_SESSION_SECRET as string) || "a-secret-key",
    /** Session expiry in milliseconds (default 7 days). */
    sessionExpiryMs: num(import.meta.env.VITE_SESSION_EXPIRY_MS, 7 * 24 * 60 * 60 * 1000),
  },

  // ── Maps ──────────────────────────────────────────────────────────
  map: {
    /** MapLibre style JSON URL. */
    styleUrl:
      import.meta.env.VITE_MAP_STYLE_URL ||
      "/map-styles/hormuz-dark.json",
    /** Raster tile server URL (XYZ template). */
    tilesUrl: import.meta.env.VITE_MAP_TILES_URL || "",
    /** Default center [lon, lat]. */
    defaultCenter: [54.5, 25.5] as [number, number],
    /** Default zoom. */
    defaultZoom: 6,
    /** Default min zoom. */
    minZoom: 2,
    /** Default max zoom. */
    maxZoom: 18,
  },

  // ── Feature flags ─────────────────────────────────────────────────
  features: {
    /** Enable WebSocket telemetry stream. */
    websocket: bool(import.meta.env.VITE_FEATURE_WS, true),
    /** Enable SSE traces stream. */
    sse: bool(import.meta.env.VITE_FEATURE_SSE, true),
    /** Enable admin dataset management. */
    datasets: bool(import.meta.env.VITE_FEATURE_DATASETS, true),
  },

  // ── Observability ─────────────────────────────────────────────────
  observability: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
    analyticsId: import.meta.env.VITE_ANALYTICS_ID as string | undefined,
  },

  // ── App metadata ──────────────────────────────────────────────────
  meta: {
    name: "HormuzWatch",
    version: (import.meta.env.VITE_APP_VERSION as string) || "2.0.0",
    buildTime: import.meta.env.VITE_BUILD_TIME as string | undefined,
  },
} as const;

export type Env = typeof env;
