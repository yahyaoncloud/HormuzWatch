import type { Map as MapLibreMap } from 'maplibre-gl';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================
// UI Store (Global UI state)
// ============================================================

interface UIState {
  // Modals
  modals: Record<string, { open: boolean; data?: unknown }>;
  openModal: (id: string, data?: unknown) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Sidebars/Drawers
  sidebars: Record<string, boolean>;
  toggleSidebar: (id: string) => void;
  openSidebar: (id: string) => void;
  closeSidebar: (id: string) => void;

  // Toasts
  toasts: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    duration?: number;
  }>;
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => string;
  removeToast: (id: string) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Global loading
  globalLoading: number;
  startLoading: () => void;
  stopLoading: () => void;

  // Responsive
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector(
    immer((set) => ({
      modals: {},
      openModal: (id, data) =>
        set((state) => {
          state.modals[id] = { open: true, data };
        }),
      closeModal: (id) =>
        set((state) => {
          delete state.modals[id];
        }),
      closeAllModals: () =>
        set((state) => {
          state.modals = {};
        }),

      sidebars: {},
      toggleSidebar: (id) =>
        set((state) => {
          state.sidebars[id] = !state.sidebars[id];
        }),
      openSidebar: (id) =>
        set((state) => {
          state.sidebars[id] = true;
        }),
      closeSidebar: (id) =>
        set((state) => {
          state.sidebars[id] = false;
        }),

      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).slice(2, 9);
        set((state) => {
          state.toasts.push({ ...toast, id });
        });
        if (toast.duration !== 0) {
          setTimeout(() => {
            set((state) => {
              state.toasts = state.toasts.filter((t) => t.id !== id);
            });
          }, toast.duration ?? 5000);
        }
        return id;
      },
      removeToast: (id) =>
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) =>
        set((state) => {
          state.commandPaletteOpen = open;
        }),

      globalLoading: 0,
      startLoading: () =>
        set((state) => {
          state.globalLoading += 1;
        }),
      stopLoading: () =>
        set((state) => {
          state.globalLoading = Math.max(0, state.globalLoading - 1);
        }),

      isMobile: false,
      setIsMobile: (mobile) =>
        set((state) => {
          state.isMobile = mobile;
        }),
    }))
  )
);

// ============================================================
// Map Store (Map state, layers, viewport)
// ============================================================

import type { MapLayerConfig } from '@/providers';

interface MapState {
  // Viewport
  viewport: {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
  };
  setViewport: (viewport: Partial<MapState['viewport']>) => void;
  flyTo: (
    viewport: Partial<MapState['viewport']>,
    options?: { duration?: number; easing?: (t: number) => number }
  ) => void;

  // Layers
  layers: MapLayerConfig[];
  setLayers: (layers: MapLayerConfig[]) => void;
  addLayer: (layer: MapLayerConfig) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<MapLayerConfig>) => void;
  reorderLayers: (layerIds: string[]) => void;

  // Layer groups visibility
  groupVisibility: Record<string, boolean>;
  toggleGroup: (group: string) => void;
  setGroupVisibility: (group: string, visible: boolean) => void;

  // Selection
  selectedFeature: GeoJSON.Feature | null;
  setSelectedFeature: (feature: GeoJSON.Feature | null) => void;

  // Tools
  activeTool: 'navigate' | 'draw' | 'measure' | 'inspect' | null;
  setActiveTool: (tool: MapState['activeTool']) => void;

  // Map instance (for direct access)
  mapInstance: MapLibreMap | null;
  setMapInstance: (map: MapLibreMap | null) => void;
}

export const useMapStore = create<MapState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      viewport: {
        center: [54.5, 25.5],
        zoom: 6,
        bearing: 0,
        pitch: 0,
      },
      setViewport: (updates) =>
        set((state) => {
          Object.assign(state.viewport, updates);
        }),
      flyTo: (viewport, options) => {
        const map = get().mapInstance;
        if (map) {
          map.flyTo({ ...get().viewport, ...viewport, ...options });
        } else {
          get().setViewport(viewport);
        }
      },

      layers: [],
      setLayers: (layers) =>
        set((state) => {
          state.layers = layers;
        }),
      addLayer: (layer) =>
        set((state) => {
          state.layers.push(layer);
        }),
      removeLayer: (layerId) =>
        set((state) => {
          state.layers = state.layers.filter((l) => l.id !== layerId);
        }),
      updateLayer: (layerId, updates) =>
        set((state) => {
          const idx = state.layers.findIndex((l) => l.id === layerId);
          if (idx >= 0) Object.assign(state.layers[idx], updates);
        }),
      reorderLayers: (layerIds) =>
        set((state) => {
          const layerMap = new Map(state.layers.map((l) => [l.id, l]));
          state.layers = layerIds.map((id) => layerMap.get(id)!).filter(Boolean);
        }),

      groupVisibility: {
        base: true,
        intelligence: true,
        infrastructure: true,
        environmental: true,
        overlays: true,
      },
      toggleGroup: (group) =>
        set((state) => {
          state.groupVisibility[group] = !state.groupVisibility[group];
        }),
      setGroupVisibility: (group, visible) =>
        set((state) => {
          state.groupVisibility[group] = visible;
        }),

      selectedFeature: null,
      setSelectedFeature: (feature) =>
        set((state) => {
          state.selectedFeature = feature;
        }),

      activeTool: null,
      setActiveTool: (tool) =>
        set((state) => {
          state.activeTool = tool;
        }),

      mapInstance: null,
      setMapInstance: (map) => set({ mapInstance: map }),
    }))
  )
);

// ============================================================
// Metric Store (Real-time metrics)
// ============================================================

interface MetricData {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  sparkline?: number[];
  threshold?: { warn: number; critical: number };
  format?: (v: number) => string;
  realtime: boolean;
  lastUpdated: number;
}

interface MetricState {
  metrics: Record<string, MetricData>;
  setMetric: (metric: MetricData) => void;
  updateMetric: (id: string, updates: Partial<MetricData>) => void;
  removeMetric: (id: string) => void;
  getMetric: (id: string) => MetricData | undefined;
  getAllMetrics: () => MetricData[];

  // Subscriptions for real-time updates
  subscriptions: Record<string, Set<(metric: MetricData) => void>>;
  subscribe: (id: string, callback: (metric: MetricData) => void) => () => void;
}

export const useMetricStore = create<MetricState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      metrics: {},
      subscriptions: {},

      setMetric: (metric) =>
        set((state) => {
          state.metrics[metric.id] = metric;
        }),

      updateMetric: (id, updates) =>
        set((state) => {
          if (state.metrics[id]) {
            Object.assign(state.metrics[id], updates, { lastUpdated: Date.now() });

            // Notify subscribers
            const subs = state.subscriptions[id];
            if (subs) {
              subs.forEach((cb) => cb(state.metrics[id]!));
            }
          }
        }),

      removeMetric: (id) =>
        set((state) => {
          delete state.metrics[id];
          delete state.subscriptions[id];
        }),

      getMetric: (id) => get().metrics[id],
      getAllMetrics: () => Object.values(get().metrics),

      subscribe: (id, callback) => {
        set((state) => {
          if (!state.subscriptions[id]) {
            state.subscriptions[id] = new Set();
          }
          state.subscriptions[id].add(callback);
        });

        // Return unsubscribe function
        return () => {
          set((state) => {
            state.subscriptions[id]?.delete(callback);
            if (state.subscriptions[id]?.size === 0) {
              delete state.subscriptions[id];
            }
          });
        };
      },
    }))
  )
);

// ============================================================
// Incident Store (Alerts, incidents, events)
// ============================================================

interface Incident {
  id: string;
  type: 'anomaly' | 'alert' | 'weather' | 'security' | 'traffic' | 'environmental';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  region: string;
  location: [number, number];
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  metadata?: Record<string, unknown>;
  source: 'ais' | 'adsb' | 'satellite' | 'weather' | 'news' | 'manual';
  relatedVessels?: string[];
  relatedAircraft?: string[];
}

interface IncidentState {
  incidents: Incident[];
  alerts: Incident[]; // High severity unacknowledged
  history: Incident[];
  maxHistory: number;

  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  acknowledgeIncident: (id: string, user: string) => void;
  removeIncident: (id: string) => void;
  clearHistory: () => void;

  // Filters
  filters: {
    types: Incident['type'][];
    severities: Incident['severity'][];
    regions: string[];
    acknowledged: boolean | null;
    timeRange: [number, number] | null;
  };
  setFilters: (filters: Partial<IncidentState['filters']>) => void;
  clearFilters: () => void;

  // Computed
  getFilteredIncidents: () => Incident[];
  getIncidentsByRegion: (region: string) => Incident[];
  getIncidentsByType: (type: Incident['type']) => Incident[];
  getUnacknowledgedCount: () => number;
}

const defaultFilters = {
  types: [] as Incident['type'][],
  severities: [] as Incident['severity'][],
  regions: [] as string[],
  acknowledged: null as boolean | null,
  timeRange: null as [number, number] | null,
};

export const useIncidentStore = create<IncidentState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      incidents: [],
      alerts: [],
      history: [],
      maxHistory: 10000,
      filters: defaultFilters,

      addIncident: (incident) =>
        set((state) => {
          state.incidents.unshift(incident);
          state.history.unshift(incident);

          // Trim history
          if (state.history.length > state.maxHistory) {
            state.history = state.history.slice(0, state.maxHistory);
          }

          // Update alerts
          if (incident.severity === 'high' || incident.severity === 'critical') {
            if (!incident.acknowledged) {
              state.alerts.unshift(incident);
            }
          }
        }),

      updateIncident: (id, updates) =>
        set((state) => {
          const idx = state.incidents.findIndex((i) => i.id === id);
          if (idx >= 0) {
            Object.assign(state.incidents[idx], updates);
          }

          const histIdx = state.history.findIndex((i) => i.id === id);
          if (histIdx >= 0) {
            Object.assign(state.history[histIdx], updates);
          }

          const alertIdx = state.alerts.findIndex((i) => i.id === id);
          if (alertIdx >= 0) {
            Object.assign(state.alerts[alertIdx], updates);
            if (
              updates.acknowledged ||
              (updates.severity && updates.severity !== 'high' && updates.severity !== 'critical')
            ) {
              state.alerts.splice(alertIdx, 1);
            }
          }
        }),

      acknowledgeIncident: (id, user) => {
        get().updateIncident(id, {
          acknowledged: true,
          acknowledgedBy: user,
          acknowledgedAt: Date.now(),
        });
      },

      removeIncident: (id) =>
        set((state) => {
          state.incidents = state.incidents.filter((i) => i.id !== id);
          state.alerts = state.alerts.filter((i) => i.id !== id);
        }),

      clearHistory: () =>
        set((state) => {
          state.history = [];
        }),

      setFilters: (filters) =>
        set((state) => {
          Object.assign(state.filters, filters);
        }),
      clearFilters: () =>
        set((state) => {
          state.filters = defaultFilters;
        }),

      getFilteredIncidents: () => {
        const { incidents, filters } = get();
        return incidents.filter((incident) => {
          if (filters.types.length && !filters.types.includes(incident.type)) return false;
          if (filters.severities.length && !filters.severities.includes(incident.severity))
            return false;
          if (filters.regions.length && !filters.regions.includes(incident.region)) return false;
          if (filters.acknowledged !== null && incident.acknowledged !== filters.acknowledged)
            return false;
          if (
            filters.timeRange &&
            (incident.timestamp < filters.timeRange[0] || incident.timestamp > filters.timeRange[1])
          )
            return false;
          return true;
        });
      },

      getIncidentsByRegion: (region) => get().incidents.filter((i) => i.region === region),
      getIncidentsByType: (type) => get().incidents.filter((i) => i.type === type),
      getUnacknowledgedCount: () => get().incidents.filter((i) => !i.acknowledged).length,
    }))
  )
);

// ============================================================
// Admin Store (Supabase session-based)
// ============================================================

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { adminLogout } from '@/lib/auth';

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

interface AdminState {
  session: Session | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
}

function toAdminUser(user: SupabaseUser | undefined): AdminUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Admin',
  };
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isAuthenticated: false,
      isVerified: false,
      setSession: (session) =>
        set({
          session,
          user: toAdminUser(session?.user),
          isAuthenticated: !!session,
          isVerified: !!session?.user?.email_confirmed_at,
        }),
      logout: async () => {
        await adminLogout();
        set({ session: null, user: null, isAuthenticated: false, isVerified: false });
      },
    }),
    {
      name: 'hormuzwatch_admin_store',
    }
  )
);

// ============================================================
// Settings Store (User preferences)
// ============================================================

interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: SettingsState['theme']) => void;

  units: 'metric' | 'imperial' | 'nautical';
  setUnits: (units: SettingsState['units']) => void;

  mapStyle: 'dark' | 'light' | 'satellite' | 'hybrid';
  setMapStyle: (style: SettingsState['mapStyle']) => void;

  language: string;
  setLanguage: (lang: string) => void;

  timezone: string;
  setTimezone: (tz: string) => void;

  notifications: {
    desktop: boolean;
    sound: boolean;
    alerts: boolean;
    metrics: boolean;
  };
  setNotifications: (notifications: Partial<SettingsState['notifications']>) => void;

  dataRetention: number; // days
  setDataRetention: (days: number) => void;

  autoRefresh: boolean;
  refreshInterval: number; // seconds
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;

  // Persistence
  load: () => void;
  save: () => void;
  reset: () => void;
}

const defaultSettings = {
  theme: 'dark' as const,
  units: 'metric' as const,
  mapStyle: 'dark' as const,
  language: 'en',
  timezone: 'UTC',
  notifications: { desktop: true, sound: true, alerts: true, metrics: false },
  dataRetention: 30,
  autoRefresh: true,
  refreshInterval: 30,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    subscribeWithSelector(
      immer((set) => ({
        ...defaultSettings,

        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('hw_theme', theme);
              const isDark =
                theme === 'dark' ||
                (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              document.documentElement.classList.toggle('dark', isDark);
            } catch {}
          }
        },
        setUnits: (units) =>
          set((state) => {
            state.units = units;
          }),
        setMapStyle: (style) =>
          set((state) => {
            state.mapStyle = style;
          }),
        setLanguage: (lang) =>
          set((state) => {
            state.language = lang;
          }),
        setTimezone: (tz) =>
          set((state) => {
            state.timezone = tz;
          }),
        setNotifications: (notifications) =>
          set((state) => {
            Object.assign(state.notifications, notifications);
          }),
        setDataRetention: (days) =>
          set((state) => {
            state.dataRetention = days;
          }),
        setAutoRefresh: (enabled) =>
          set((state) => {
            state.autoRefresh = enabled;
          }),
        setRefreshInterval: (interval) =>
          set((state) => {
            state.refreshInterval = interval;
          }),

        load: () => {},
        save: () => {},
        reset: () =>
          set((state) => {
            Object.assign(state, defaultSettings);
          }),
      }))
    ),
    {
      name: 'hw_settings',
    }
  )
);
