/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ── Go Backend ───────────────────────────────────────────────
  readonly VITE_API_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;

  // ── WebSocket ────────────────────────────────────────────────
  readonly VITE_WS_TELEMETRY_URL?: string;
  readonly VITE_WS_RECONNECT_INITIAL_MS?: string;
  readonly VITE_WS_RECONNECT_MAX_MS?: string;
  readonly VITE_WS_MAX_RECONNECT?: string;

  // ── Server-Sent Events ──────────────────────────────────────
  readonly VITE_SSE_TRACES_URL?: string;
  readonly VITE_SSE_RECONNECT_MS?: string;

  // ── Supabase ─────────────────────────────────────────────────
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;

  // ── Maps ─────────────────────────────────────────────────────
  readonly VITE_MAP_STYLE_URL?: string;
  readonly VITE_MAP_TILES_URL?: string;

  // ── Feature Flags ────────────────────────────────────────────
  readonly VITE_FEATURE_WS?: string;
  readonly VITE_FEATURE_SSE?: string;
  readonly VITE_FEATURE_DATASETS?: string;

  // ── Observability ────────────────────────────────────────────
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ANALYTICS_ID?: string;

  // ── App Metadata ─────────────────────────────────────────────
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BUILD_TIME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.mdx' {
  import { ComponentType } from 'react';

  const component: ComponentType<{ components?: Record<string, ComponentType> }>;
  export default component;
}

declare module '*.svg' {
  import { FC, SVGProps } from 'react';

  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}
