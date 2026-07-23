// API Client for HormuzWatch REST endpoints
// Matches server/internal/api/* handlers

import { getSupabase, isSupabaseAvailable } from './supabase';
import { getAdminSessionCookie } from './session';
import { useAdminStore } from '@/stores';
import type { ConflictFeedResponse } from '@/types/websocket';
import { env } from "@/environments/environment";

// ============================================================
// Types
// ============================================================

export interface ActiveTrack {
  trackId: string;
  assetName: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  anomalyScore: number;
  severity: string;
  lastUpdated: string;
  altitude?: number;
  squawk?: string;
  onGround?: boolean;
  objectType?: string;
}

export interface TracksResponse {
  type: 'vessels' | 'aircraft' | 'tracks';
  count: number;
  data: ActiveTrack[];
  timestamp: string;
}

export interface TopTrace {
  trackId: string;
  assetName: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  score: number;
  severity: string;
  reasons: string;
  updatedAt: string;
}

export interface TopTracesResponse {
  status: string;
  count: number;
  traces: TopTrace[];
  timestamp: string;
}

export interface PublicMetrics {
  totalTracks: number;
  maritimeCount: number;
  aviationCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgScore: number;
  activeRegions: number;
  timestamp: string;
}

export interface PublicMetricsResponse {
  status: string;
  metrics: PublicMetrics;
  timestamp: string;
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary: string;
}

export interface NewsResponse {
  news: NewsItem[];
}

export interface HistoricalAttack {
  siteName: string;
  country: string;
  latitude: number;
  longitude: number;
  primaryTargetType: string;
  conflictContext: string;
  reportedDate: string;
}

export interface TrackHistoryTrack {
  trackId: string;
  assetName: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  courseDelta: number;
  aisAgeMinutes: number;
  hotZoneDistanceNm: number;
  lastUpdated: string;
}

export interface TrackHistoryAnomaly {
  score: number;
  severity: string;
  reasons: string[];
  actions: string[];
}

export interface TrackHistoryResponse {
  track: TrackHistoryTrack;
  anomaly: TrackHistoryAnomaly;
}

export interface RestrictedZone {
  id: string;
  name: string;
  type: string;
  coordinates: number[][][];
  description: string;
  severity: string;
}

export interface HeatmapResponse {
  type: string;
  source: string;
  data: number[][];
}

export interface AIBriefing {
  executive_summary: string;
  threat_analysis: string[];
  tactical_recommendations: string[];
  generated_at: string;
  source: 'ai' | 'fallback';
}

export interface ReportSection {
  title: string;
  content: string[];
}

export interface DetailedReport {
  report_id: string;
  title: string;
  classification: string;
  generated_at: string;
  source: 'ai' | 'fallback';
  period_covered: string;
  executive_summary: string;
  sections: ReportSection[];
  appendices: string[];
}

// ============================================================
// Base API Client
// ============================================================

// ============================================================
// Base API Client
// ============================================================

const API_BASE = env.api.baseUrl;

const DEFAULT_TIMEOUT_MS = env.api.timeoutMs;

function createTimeoutSignal(timeoutMs: number = DEFAULT_TIMEOUT_MS): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token: string | undefined;

  // 1. Try Supabase Session
  if (isSupabaseAvailable()) {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      token = session?.access_token;
    } catch {
      // Ignore Supabase resolution error
    }
  }

  // 2. Fallback to Admin Cookie Session
  if (!token) {
    const cookieSession = getAdminSessionCookie();
    token = cookieSession?.token;
  }

  // 3. Fallback to Zustand Store Session
  if (!token) {
    token = useAdminStore.getState().session?.access_token;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { signal, cleanup } = createTimeoutSignal();
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal || signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    cleanup();
  }
}

async function fetchPublic<T>(path: string): Promise<T> {
  const { signal, cleanup } = createTimeoutSignal();
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    cleanup();
  }
}

// ============================================================
// Public Endpoints (no auth required)
// ============================================================

/** Get top 10 anomalous traces (public) */
export async function getTopTraces(): Promise<TopTracesResponse> {
  return fetchPublic<TopTracesResponse>('/public/top-traces');
}

/** Get aggregate platform metrics (public) */
export async function getPublicMetrics(): Promise<PublicMetricsResponse> {
  return fetchPublic<PublicMetricsResponse>('/public/metrics');
}

/** Get historical attacks (public) */
export async function getHistoricalAttacks(): Promise<HistoricalAttack[]> {
  return fetchPublic<HistoricalAttack[]>('/public/history/attacks');
}

/** Get restricted zones (public) */
export async function getRestrictedZones(): Promise<RestrictedZone[]> {
  return fetchPublic<RestrictedZone[]>('/public/zones/restricted');
}

/** Get intelligence news (public) */
export async function getNews(): Promise<NewsResponse> {
  return fetchPublic<NewsResponse>('/public/news');
}

/** Get natural language AI analyst briefing (public) */
export async function getAIBriefing(): Promise<AIBriefing> {
  return fetchPublic<AIBriefing>('/public/briefing');
}

/** Get detailed intelligence report (public) */
export async function getDetailedReport(): Promise<DetailedReport> {
  return fetchPublic<DetailedReport>('/public/report');
}

/** Get detailed intelligence report as PDF (public) */
export async function getDetailedReportPDF(): Promise<Blob> {
  const response = await fetch(`${API_BASE}/public/report/pdf`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.blob();
}

/** Get live conflict intelligence feed for the Gulf region */
export async function getConflictFeed(): Promise<ConflictFeedResponse> {
  return fetchPublic<ConflictFeedResponse>('/public/conflicts');
}

/** Get heatmap data (public) */
export async function getHeatmap(
  source: 'vessel' | 'fire' | 'geo' | 'all' = 'vessel'
): Promise<HeatmapResponse> {
  return fetchPublic<HeatmapResponse>(`/public/heatmap?source=${source}`);
}

// ============================================================
// Authenticated Endpoints
// ============================================================

/** Get all active vessels (auth required) */
export async function getActiveVessels(): Promise<TracksResponse> {
  return fetchWithAuth<TracksResponse>('/vessels');
}

/** Get all active aircraft (auth required) */
export async function getActiveAircraft(): Promise<TracksResponse> {
  return fetchWithAuth<TracksResponse>('/aircraft');
}

/** Get all active tracks (auth required) */
export async function getAllActiveTracks(): Promise<TracksResponse> {
  return fetchWithAuth<TracksResponse>('/tracks/active');
}

/** Get track history with anomaly details (auth required) */
export async function getTrackHistory(trackId: string): Promise<TrackHistoryResponse> {
  return fetchWithAuth<TrackHistoryResponse>(`/tracks/${encodeURIComponent(trackId)}/history`);
}

/** Post telemetry data (auth required) */
export async function postTelemetry(payload: {
  trackId: string;
  assetName: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  previousSpeed?: number;
  heading: number;
  courseDelta?: number;
  aisAgeMinutes: number;
  hotZoneDistanceNm: number;
  altitude?: number;
  squawk?: string;
  onGround?: boolean;
  objectType?: string;
}): Promise<{ status: string; trackId: string }> {
  return fetchWithAuth<{ status: string; trackId: string }>('/telemetry', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Analyze telemetry for anomalies (auth required) */
export async function analyzeTelemetry(payload: Parameters<typeof postTelemetry>[0]): Promise<{
  id: string;
  score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reasons: string[];
  actions: string[];
}> {
  return fetchWithAuth('/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Get intelligence news (auth required) */
export async function getNewsAuth(): Promise<NewsResponse> {
  return fetchWithAuth<NewsResponse>('/news');
}

/** Get heatmap (auth required) */
export async function getHeatmapAuth(
  source: 'vessel' | 'fire' | 'geo' | 'all' = 'vessel'
): Promise<HeatmapResponse> {
  return fetchWithAuth<HeatmapResponse>(`/heatmap?source=${source}`);
}

/** Get historical attacks (auth required) */
export async function getHistoricalAttacksAuth(): Promise<HistoricalAttack[]> {
  return fetchWithAuth<HistoricalAttack[]>('/history/attacks');
}

/** Get restricted zones (auth required) */
export async function getRestrictedZonesAuth(): Promise<RestrictedZone[]> {
  return fetchWithAuth<RestrictedZone[]>('/zones/restricted');
}

/** Get watchlist (auth required) */
export async function getWatchlist(): Promise<string[]> {
  return fetchWithAuth<string[]>('/watchlist');
}

/** Add to watchlist (auth required) */
export async function addToWatchlist(trackId: string): Promise<{ status: string }> {
  return fetchWithAuth<{ status: string }>(`/watchlist/${encodeURIComponent(trackId)}`, {
    method: 'POST',
  });
}

/** Remove from watchlist (auth required) */
export async function removeFromWatchlist(trackId: string): Promise<{ status: string }> {
  return fetchWithAuth<{ status: string }>(`/watchlist/${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  });
}

export interface ActiveTrack {
  trackId: string;
  assetName: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  anomalyScore: number;
  severity: string;
  lastUpdated: string;
  altitude?: number;
  squawk?: string;
  onGround?: boolean;
  objectType?: string;
}

export interface ActiveTracksResponse {
  type: string;
  count: number;
  data: ActiveTrack[];
  timestamp: string;
}

/** Get settings (auth required) */
export async function getSettings(): Promise<Record<string, unknown>> {
  return fetchWithAuth<Record<string, unknown>>('/settings');
}

/** Update settings (auth required) */
export async function updateSettings(
  settings: Record<string, unknown>
): Promise<{ status: string }> {
  return fetchWithAuth<{ status: string }>('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// ============================================================
// Admin / Content Management (single secure admin)
// ============================================================

export interface SessionUser {
  username: string;
  email: string;
  role: 'admin' | 'analyst' | 'operator' | 'viewer' | 'user';
}

export interface SiteUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface PendingUser {
  username: string;
  email: string;
  createdAt: string;
}

/** Get the current authenticated session (used to detect admin role). */
export async function getSession(): Promise<{ status: string; user: SessionUser }> {
  return fetchWithAuth<{ status: string; user: SessionUser }>('/auth/session');
}

/** List all registered users (admin only). */
export async function getUsers(): Promise<SiteUser[]> {
  return fetchWithAuth<SiteUser[]>('/auth/users');
}

/** List pending (awaiting approval) users (admin only). */
export async function getPendingUsers(): Promise<PendingUser[]> {
  return fetchWithAuth<PendingUser[]>('/auth/pending');
}

/** Approve a pending user (admin only). */
export async function approveUser(username: string): Promise<{ status: string; message: string }> {
  return fetchWithAuth<{ status: string; message: string }>(
    `/auth/approve/${encodeURIComponent(username)}`,
    { method: 'POST' }
  );
}

/** Blacklist a user (admin only). */
export async function blacklistUser(
  username: string
): Promise<{ status: string; message: string }> {
  return fetchWithAuth<{ status: string; message: string }>(
    `/auth/blacklist/${encodeURIComponent(username)}`,
    { method: 'POST' }
  );
}

/** Remove a blacklist restriction (admin only). */
export async function unblacklistUser(
  username: string
): Promise<{ status: string; message: string }> {
  return fetchWithAuth<{ status: string; message: string }>(
    `/auth/unblacklist/${encodeURIComponent(username)}`,
    { method: 'POST' }
  );
}

/** Delete a user (admin only). */
export async function deleteUser(username: string): Promise<{ status: string; message: string }> {
  return fetchWithAuth<{ status: string; message: string }>(
    `/auth/users/${encodeURIComponent(username)}`,
    { method: 'DELETE' }
  );
}

// ---- Datasets (queue-based GDrive pipeline) ----

export interface DatasetFile {
  id: string;
  name: string;
  size: string | number;
  createdTime: string;
}

export interface DatasetStatus {
  queueDepth: number;
  lastUpload: string;
  retention: number;
  folderId: string;
  driveConfigured: boolean;
}

/** List dataset files currently in the Drive folder (open). */
export async function getDatasets(): Promise<{ datasets: DatasetFile[]; count: number }> {
  return fetchPublic<{ datasets: DatasetFile[]; count: number }>('/datasets');
}

/** Get dataset pipeline runtime state (open). */
export async function getDatasetStatus(): Promise<DatasetStatus> {
  return fetchPublic<DatasetStatus>('/datasets/status');
}

/**
 * Trigger a dataset snapshot for a domain. The write endpoint is gated by the
 * metrics API key (METRICS_API_KEY), passed as a Bearer token — distinct from
 * the admin user JWT.
 */
export async function snapshotDataset(
  domain: 'vessel' | 'aircraft' | 'heatmap',
  metricsKey: string
): Promise<{ status: string; domain: string; note: string }> {
  const response = await fetch(`${API_BASE}/datasets/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${metricsKey}`,
    },
    body: JSON.stringify({ domain }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/** Force the dataset queue to drain now (metrics-key gated). */
export async function flushDatasets(metricsKey: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/datasets/flush`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${metricsKey}` },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// ============================================================
// WebSocket / SSE Helpers
// ============================================================

export const WS_TELEMETRY_URL = env.ws.telemetryUrl;
export const SSE_TRACES_URL = env.sse.tracesUrl;

/** Connect to telemetry WebSocket */
export function createTelemetryWS(): WebSocket {
  return new WebSocket(WS_TELEMETRY_URL);
}

/** Connect to public traces SSE */
export function createTracesSSE(): EventSource {
  return new EventSource(SSE_TRACES_URL);
}

// ============================================================
// Intelligence Endpoints
// ============================================================

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category?: string;
  country?: string;
  imageUrl?: string;
  risk_score?: number;
  lat?: number | null;
  lon?: number | null;
}

export interface NewsMapFeature {
  id: string;
  title: string;
  lat: number;
  lon: number;
  risk_score: number;
  category: string;
  country: string;
  publishedAt: string;
}

export interface NewsMapMetrics {
  features: NewsMapFeature[];
  count: number;
  avg_risk: number;
  risk_by_country: Record<string, number>;
  bounds: { north: number; south: number; east: number; west: number };
  hours: number;
}

export interface Country {
  code: string;
  name: string;
  region: string;
  flag?: string;
  stats?: Record<string, unknown>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  type?: string;
  country?: string | null;
  language?: string | null;
  reliability?: number | string;
  enabled?: boolean;
  last_fetched_at?: string | null;
  article_count?: number;
}

export interface IntelligenceEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  location?: [number, number];
  country?: string;
  occurredAt: string;
  sources: string[];
}

export interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
}

export interface Threat {
  id: string;
  title: string;
  level: string;
  description: string;
  region: string;
  reportedAt: string;
}

export async function getLatestNews(
  params?: {
    limit?: number;
    offset?: number;
    category?: string;
    country?: string;
  }
): Promise<{ data: NewsArticle[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.category) searchParams.set('category', params.category);
  if (params?.country) searchParams.set('country', params.country);
  const qs = searchParams.toString();
  return fetchPublic(`/public/news/latest${qs ? `?${qs}` : ''}`);
}

export async function searchNews(query: string): Promise<{ data: NewsArticle[] }> {
  return fetchPublic(`/public/news/search?q=${encodeURIComponent(query)}`);
}

export async function getTrendingNews(): Promise<{ data: NewsArticle[] }> {
  return fetchPublic('/public/news/trending');
}

export async function getNewsById(id: string): Promise<NewsArticle> {
  return fetchPublic(`/public/news/${encodeURIComponent(id)}`);
}

export async function getCountries(): Promise<{ data: Country[] }> {
  return fetchPublic('/public/countries');
}

export async function getCountryDetail(code: string): Promise<Country> {
  return fetchPublic(`/public/countries/${encodeURIComponent(code)}`);
}

export async function getCategories(): Promise<{ data: Category[] }> {
  return fetchPublic('/public/categories');
}

export async function getSources(): Promise<{ data: Source[]; total: number }> {
  return fetchWithAuth<{ data: Source[]; total: number }>('/sources').catch(() =>
    fetchPublic<{ data: Source[]; total: number }>('/public/sources')
  );
}

export async function getEvents(
  params?: {
    limit?: number;
    offset?: number;
    type?: string;
    severity?: string;
  }
): Promise<{ data: IntelligenceEvent[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.type) searchParams.set('type', params.type);
  if (params?.severity) searchParams.set('severity', params.severity);
  const qs = searchParams.toString();
  return fetchPublic(`/public/events${qs ? `?${qs}` : ''}`);
}

export async function getEventDetail(id: string): Promise<IntelligenceEvent> {
  return fetchPublic(`/public/events/${encodeURIComponent(id)}`);
}

export async function getTimeline(limit?: number): Promise<{ data: TimelineEntry[] }> {
  const qs = limit ? `?limit=${limit}` : '';
  return fetchPublic(`/public/timeline${qs}`);
}

export async function getThreats(limit?: number): Promise<{ data: Threat[] }> {
  const qs = limit ? `?limit=${limit}` : '';
  return fetchPublic(`/public/threats${qs}`);
}

// ============================================================
// News Map / Heatmap
// ============================================================

export async function getNewsHeatmap(
  params?: {
    north?: number;
    south?: number;
    east?: number;
    west?: number;
    min_score?: number;
    limit?: number;
  }
): Promise<{ type: string; features: NewsMapFeature[]; count: number }> {
  const sp = new URLSearchParams();
  if (params?.north) sp.set('north', String(params.north));
  if (params?.south) sp.set('south', String(params.south));
  if (params?.east) sp.set('east', String(params.east));
  if (params?.west) sp.set('west', String(params.west));
  if (params?.min_score) sp.set('min_score', String(params.min_score));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return fetchPublic(`/public/news/heatmap${qs ? `?${qs}` : ''}`);
}

export async function getNewsMapMetrics(
  hours?: number,
  minScore?: number
): Promise<NewsMapMetrics> {
  const sp = new URLSearchParams();
  if (hours) sp.set('hours', String(hours));
  if (minScore) sp.set('min_score', String(minScore));
  const qs = sp.toString();
  return fetchPublic(`/public/news/map/metrics${qs ? `?${qs}` : ''}`);
}

// ============================================================
// Health Check
// ============================================================

export interface HealthResponse {
  status: string;
  managedIdentityEnabled: boolean;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  return fetchPublic<HealthResponse>('/health');
}

// ============================================================
// Server Settings
// ============================================================

export interface ServerSettings {
  retention_days: number;
  opensky_enabled: boolean;
  aisstream_enabled: boolean;
  kystverket_enabled: boolean;
  auto_watchlist_threshold: number;
  heatmap_enabled: boolean;
  news_enabled: boolean;
  cache_telemetry_findings: boolean;

  // Multi-Provider LLM Integration
  llm_provider?: "openrouter" | "deepseek" | "gemini" | "openai" | "ollama";
  openrouter_api_key?: string;
  openrouter_model?: string;
  openrouter_fallback_model?: string;
  deepseek_api_key?: string;
  deepseek_model?: string;
  gemini_api_key?: string;
  gemini_model?: string;
  openai_api_key?: string;
  openai_model?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  llm_threat_analysis_enabled?: boolean;
  llm_news_summarization_enabled?: boolean;
  llm_anomaly_explanation_enabled?: boolean;
  llm_temperature?: number;
  llm_max_tokens?: number;
}

export async function getServerSettings(): Promise<ServerSettings> {
  return fetchWithAuth<ServerSettings>('/settings');
}

export async function updateServerSettings(
  settings: Partial<ServerSettings>
): Promise<{ status: string }> {
  return fetchWithAuth<{ status: string }>('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

