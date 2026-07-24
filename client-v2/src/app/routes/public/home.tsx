import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Loader2,
  LocateFixed,
  Newspaper,
  Plane,
  Radio,
  Rss,
  ShieldAlert,
  Ship,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import { LiveStatStrip, type MetricKey } from '@/components/data/LiveStatStrip';
import {
  IntelligenceConsole,
  formatTimeAgo,
} from '@/components/intelligence/IntelligenceConsole';
import { IntelligenceDashboard } from '@/components/intelligence/IntelligenceDashboard';
import { MetricDetailSheet } from '@/components/intelligence/MetricDetailSheet';
import { ReportProgressModal } from '@/components/intelligence/ReportProgressModal';
import { SettingsSheet } from '@/components/intelligence/SettingsSheet';
import {
  ThreatDetailModal,
  ThreatsPanel,
  type ThreatItem,
} from '@/components/intelligence/ThreatsPanel';
const LeafletMap = lazy(() =>
  import('@/components/maps/LeafletMap').then((m) => ({ default: m.LeafletMap }))
);
import { DisclaimerModal } from '@/components/ui/DisclaimerModal';
import {
  getDetailedReport,
  getDetailedReportPDF,
  getNews,
  getPublicMetrics,
  getServerSettings,
  getTopTraces,
  getBlockadeIndicators,
  getTransits,
  type BlockadeIndicators,
  type TransitSummary,
} from '@/lib/api';
import { cn } from '@/utils/cn';
import { env } from "@/environments/environment";
import { useUIStore, useRealtimeStore } from '@/stores';
import { useWebSocket } from '@/providers';

function getRegionNameByCoords(_lat: number, lon: number): string {
  if (lon < 56.0) return 'Persian Gulf';
  if (lon >= 56.0 && lon <= 59.0) return 'Strait of Hormuz';
  return 'Gulf of Oman';
}

export async function clientLoader() {
  const timeout = (ms: number) => new Promise<null>((r) => setTimeout(() => r(null), ms));

  const [metricsResponse, tracesResponse, newsResponse] = await Promise.all([
    Promise.race([getPublicMetrics().catch(() => null), timeout(600)]),
    Promise.race([getTopTraces().catch(() => null), timeout(600)]),
    Promise.race([getNews().catch(() => null), timeout(600)]),
  ]);

  return {
    initialMetrics: metricsResponse ?? null,
    initialTraces: tracesResponse ?? null,
    initialNews: newsResponse ?? null,
  };
}

export const loader = clientLoader;

export function HomePage() {
  const loaderData = useLoaderData<typeof clientLoader>();

  // Metrics come from WebSocket stats (real-time push, no polling needed).
  // Initial hydration from clientLoader; WS takes over after connect.
  const { data, isLoading } = useQuery({
    queryKey: ['public-metrics-home'],
    queryFn: getPublicMetrics,
    placeholderData: loaderData?.initialMetrics ?? undefined,
    refetchInterval: false,
    staleTime: Infinity,
  });

  // Traces come from SSE stream (real-time push, no polling needed).
  const { data: tracesData } = useQuery({
    queryKey: ['public-traces-home'],
    queryFn: getTopTraces,
    initialData: loaderData?.initialTraces ?? undefined,
    refetchInterval: false,
    staleTime: Infinity,
  });

  const { data: newsData } = useQuery({
    queryKey: ['public-news-feed'],
    queryFn: getNews,
    initialData: loaderData?.initialNews ?? undefined,
    refetchInterval: 60000,
  });

  const { data: blockade } = useQuery<BlockadeIndicators>({
    queryKey: ['public-blockade'],
    queryFn: getBlockadeIndicators,
    refetchInterval: 60000,
  });

  const { data: transits } = useQuery<TransitSummary>({
    queryKey: ['public-transits'],
    queryFn: () => getTransits(24),
    refetchInterval: 60000,
  });

  // ── WebSocket real-time stats via Zustand (single source of truth) ────
  const liveStats = useRealtimeStore((s) => s.stats);
  const { subscribe } = useWebSocket();
  const [realtimeTracesMap, setRealtimeTracesMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const unsubTelemetry = subscribe('telemetry', (payload: any) => {
      if (!payload) return;
      const items = Array.isArray(payload) ? payload : [payload];
      setRealtimeTracesMap((prev) => {
        const next = new Map(prev);
        for (const t of items) {
          const id = String(t.trackId || t.id || '');
          if (!id) continue;
          const existing = next.get(id) || {};
          next.set(id, {
            ...existing,
            trackId: id,
            assetName: t.assetName || id,
            timestamp: t.timestamp || new Date().toISOString(),
            lat: t.lat,
            lon: t.lon,
            speed: t.speed,
            heading: t.heading || 0,
            score: t.anomalyScore ?? existing.score ?? 0,
            severity: t.severity || existing.severity || 'low',
            reasons: t.reasons ? JSON.stringify(t.reasons) : existing.reasons || '[]',
            updatedAt: new Date().toISOString(),
          });
        }
        return next;
      });
    });

    const unsubAnomaly = subscribe('anomaly', (payload: any) => {
      if (!payload) return;
      const items = Array.isArray(payload) ? payload : [payload];
      setRealtimeTracesMap((prev) => {
        const next = new Map(prev);
        for (const a of items) {
          const id = String(a.trackId || a.id || '');
          if (!id) continue;
          const existing = next.get(id) || {};
          next.set(id, {
            ...existing,
            trackId: id,
            score: a.score ?? a.final_score ?? existing.score ?? 0,
            severity: a.severity || existing.severity || 'medium',
            reasons: Array.isArray(a.reasons) ? JSON.stringify(a.reasons) : a.reasons || existing.reasons || '[]',
            updatedAt: new Date().toISOString(),
          });
        }
        return next;
      });
    });

    return () => {
      unsubTelemetry();
      unsubAnomaly();
    };
  }, [subscribe]);

  // Combine initial REST traces + real-time WebSocket traces
  const mergedTraces = Array.from(
    new Map([
      ...(tracesData?.traces ?? []).map((t) => [t.trackId, t] as const),
      ...Array.from(realtimeTracesMap.entries()),
    ]).values()
  );

  const metrics = data?.metrics;
  const liveTraces = mergedTraces.length > 0 ? mergedTraces : (tracesData?.traces ?? []);
  const newsItems = newsData?.news ?? [];

  // Merge: WebSocket stats take priority over REST metrics
  const displayMetrics = liveStats
    ? {
        maritimeCount: liveStats.maritimeCount,
        aviationCount: liveStats.aviationCount,
        totalTracks: liveStats.totalTracks,
        activeRegions: 3, // computed server-side from TSM data
        avgScore: Math.round(liveStats.avgEWMA * 10),
        criticalCount: liveStats.highAnomalyCount,
        highCount: liveStats.totalAnomalies - liveStats.highAnomalyCount,
        mediumCount: 0,
        lowCount: 0,
        timestamp: liveStats.updatedAt,
      }
    : metrics;

  const [showHeatmap, setShowHeatmap] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hw-show-heatmap') === '1';
  });
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('hw-reduce-motion') === '1'
  );

  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cacheTelemetry, setCacheTelemetry] = useState(true);

  useEffect(() => {
    getServerSettings()
      .then((s) => setCacheTelemetry(s.cache_telemetry_findings))
      .catch(() => {});
  }, []);

  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hw-disclaimer-dismissed') !== '1';
  });

  // Drag-resize panel widths (limited freeform)
  const [leftPanelW, setLeftPanelW] = useState(240);  // min 200, max 400
  const [rightPanelW, setRightPanelW] = useState(288); // min 240, max 500

  const dragState = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const delta = e.clientX - startX.current;
      const newW = startW.current + (dragState.current === 'left' ? delta : -delta);
      const clamped = Math.max(dragState.current === 'left' ? 200 : 240, Math.min(dragState.current === 'left' ? 400 : 500, newW));
      if (dragState.current === 'left') setLeftPanelW(clamped);
      else setRightPanelW(clamped);
    };
    const onUp = () => { dragState.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Tab navigation: Map | Intelligence | Feed
  const [activeTab, setActiveTab] = useState<'map' | 'intelligence' | 'feed'>(() => {
    if (typeof window === 'undefined') return 'map';
    return (localStorage.getItem('hw-active-tab') as any) || 'map';
  });

  const tabs = [
    { id: 'map' as const, label: 'Map', icon: Globe },
    { id: 'intelligence' as const, label: 'Intelligence', icon: BarChart3 },
    { id: 'feed' as const, label: 'Feed', icon: Newspaper },
  ];

  const highlightZoneRef = useRef<((id: string | null) => void) | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<ThreatItem | null>(null);

  const [_searchParams, setSearchParams] = useSearchParams();

  // Timeline & filter state
  const [timeline, setTimeline] = useState<'1hr' | '3hr' | '6hr' | '12hr' | '24hr' | 'all'>(() => {
    if (typeof window === 'undefined') return 'all';
    return (localStorage.getItem('hw-timeline-filter') as any) || 'all';
  });
  const [severityFilter, setSeverityFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return localStorage.getItem('hw-severity-filter') || 'all';
  });
  const [regionFilter, setRegionFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return localStorage.getItem('hw-region-filter') || 'all';
  });

  // Map layer toggle states
  const [showVessels, setShowVessels] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('hw-show-vessels');
    return saved === null ? true : saved === '1';
  });
  const [showAircraft, setShowAircraft] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('hw-show-aircraft');
    return saved === null ? true : saved === '1';
  });
  const [showConflicts, setShowConflicts] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('hw-show-conflicts');
    return saved === null ? true : saved === '1';
  });
  const [showMetrics, setShowMetrics] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('hw-show-metrics');
    return saved === null ? true : saved === '1';
  });

  useEffect(() => {
    try {
      localStorage.setItem('hw-show-heatmap', showHeatmap ? '1' : '0');
      localStorage.setItem('hw-show-conflicts', showConflicts ? '1' : '0');
      localStorage.setItem('hw-show-metrics', showMetrics ? '1' : '0');
      localStorage.setItem('hw-timeline-filter', timeline);
      localStorage.setItem('hw-severity-filter', severityFilter);
      localStorage.setItem('hw-region-filter', regionFilter);
    } catch {}
  }, [showHeatmap, showVessels, showAircraft, showConflicts, showMetrics, timeline, severityFilter, regionFilter]);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Report generation state
  const [reportGenerating, setReportGenerating] = useState(false);

  const addToast = useUIStore(s => s.addToast);

  const timelineOptions = ['1hr', '3hr', '6hr', '12hr', '24hr', 'all'] as const;

  // Derive threat listing from live traces
  const filteredTraces = liveTraces.filter((t) => {
    if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
    if (regionFilter !== 'all') {
      const regionName = getRegionNameByCoords(t.lat, t.lon);
      if (regionFilter === 'hormuz' && regionName !== 'Strait of Hormuz') return false;
      if (regionFilter === 'pgulf' && regionName !== 'Persian Gulf') return false;
      if (regionFilter === 'goman' && regionName !== 'Gulf of Oman') return false;
      if (regionFilter === 'redsea' && !regionName.includes('Red Sea')) return false;
    }
    if (timeline !== 'all') {
      const diffHours = (Date.now() - new Date(t.timestamp).getTime()) / (1000 * 60 * 60);
      if (timeline === '1hr' && diffHours > 1) return false;
      if (timeline === '3hr' && diffHours > 3) return false;
      if (timeline === '6hr' && diffHours > 6) return false;
      if (timeline === '12hr' && diffHours > 12) return false;
      if (timeline === '24hr' && diffHours > 24) return false;
    }
    return true;
  });

  const topThreats: ThreatItem[] =
    filteredTraces.length > 0
      ? filteredTraces.map((t) => {
          let reasonsList: string[] = [];
          try {
            reasonsList = JSON.parse(t.reasons);
          } catch {
            if (t.reasons) reasonsList = t.reasons.split(',').map((r: string) => r.trim());
          }
          const primaryReason = reasonsList.length > 0 ? reasonsList[0] : 'Elevated Anomaly Score';
          const region = getRegionNameByCoords(t.lat, t.lon);
          return {
            id: t.trackId,
            title: `${primaryReason} — ${t.assetName || t.trackId}`,
            description: `Track ${t.trackId} detected in ${region}. Score: ${t.score.toFixed(0)}/100. ${reasonsList.slice(0, 2).join('; ')}`,
            severity: (t.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
            region,
            time: formatTimeAgo(new Date(t.timestamp).getTime()),
            score: t.score,
            trackId: t.trackId,
            assetName: t.assetName || t.trackId,
          };
        })
      : liveTraces.length > 0
        ? [
            {
              id: 'no-matches',
              title: 'No matching alerts',
              description:
                'No telemetry alerts match your current timeline, severity, or watch zone filters.',
              severity: 'low',
              region: 'AOR',
              time: '—',
              score: 0,
              trackId: '',
              assetName: 'Filter',
            },
          ]
        : [
            {
              id: 't1',
              title: 'Awaiting telemetry data',
              description:
                'Live vessel and aircraft tracking will appear here once the data pipeline is active.',
              severity: 'low',
              region: 'Strait of Hormuz',
              time: '—',
              score: 0,
              trackId: '',
              assetName: 'System',
            },
            {
              id: 't2',
              title: 'No alerts detected',
              description:
                'The monitoring system is operational and processing AIS/ADS-B feeds for anomaly detection.',
              severity: 'low',
              region: 'Persian Gulf',
              time: '—',
              score: 0,
              trackId: '',
              assetName: 'System',
            },
          ];

  const criticalCount = topThreats.filter((t) => t.severity === 'critical').length;
  const highCount = topThreats.filter((t) => t.severity === 'high').length;
  const totalThreats = topThreats.length;

  const vesselCount = liveStats?.maritimeCount && liveStats.maritimeCount > 0
    ? liveStats.maritimeCount
    : metrics?.maritimeCount && metrics.maritimeCount > 0
    ? metrics.maritimeCount
    : liveTraces.filter((t) => {
        const type = (t as any).objectType;
        if (type) return type === 'vessel';
        return !String(t.trackId).startsWith('FLIGHT') && !String(t.trackId).startsWith('ADS-B') && !String(t.trackId).startsWith('ICAO-');
      }).length;

  const aircraftCount = liveStats?.aviationCount && liveStats.aviationCount > 0
    ? liveStats.aviationCount
    : metrics?.aviationCount && metrics.aviationCount > 0
    ? metrics.aviationCount
    : liveTraces.filter((t) => {
        const type = (t as any).objectType;
        if (type) return type === 'aircraft';
        return String(t.trackId).startsWith('FLIGHT') || String(t.trackId).startsWith('ADS-B') || String(t.trackId).startsWith('ICAO-') || (t as any).altitude !== undefined;
      }).length;

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    try {
      window.localStorage.setItem('hw-reduce-motion', reduceMotion ? '1' : '0');
    } catch {
      /* ignore persistence failures */
    }
  }, [reduceMotion]);

  // Report generation handler
  const handleGenerateReport = useCallback(async () => {
    setReportGenerating(true);
    addToast({ type: 'info', title: 'Processing', message: 'Analyzing database traces and starting LaTeX compilation...' });
    try {
      const report = await getDetailedReport();
      if (env.isDev) {
        console.log('[Report] Detailed intelligence report fetched:', report);
      }
      const pdfBlob = await getDetailedReportPDF();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HormuzWatch_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({ type: 'success', title: 'Success', message: 'Intelligence PDF report compiled and downloaded successfully.' });
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      const errorMsg = error?.message || 'Check your internet connection or credits.';
      addToast({ type: 'error', title: 'Failure', message: `Failed to generate report: ${errorMsg}` });
    } finally {
      setReportGenerating(false);
    }
  }, [addToast]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--color-bg)]">
      {/* Disclaimer Modal */}
      <DisclaimerModal
        open={showDisclaimer}
        onClose={() => {
          setShowDisclaimer(false);
          try {
            localStorage.setItem('hw-disclaimer-dismissed', '1');
          } catch {
            /* ignore */
          }
        }}
      />

      {/* Tab Bar */}
      <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="flex px-4 py-2">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                try { localStorage.setItem('hw-active-tab', tab.id); } catch {}
              }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all border border-[var(--color-border)]',
                idx > 0 && '-ml-px',
                activeTab === tab.id
                  ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] z-10'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Map */}
      {activeTab === 'map' && (
      <div className="absolute left-0 right-0 bottom-0 top-[2.75rem] flex">
        {/* Left Console */}
        <div style={{ width: leftPanelW }} className="flex-shrink-0 overflow-hidden">
        <IntelligenceConsole
          highlightZone={(id) => highlightZoneRef.current?.(id)}
          newsItems={newsItems}
        />
        </div>

        {/* Resize handle: console | map */}
        <div
          className="w-1 hover:w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-primary-600)] cursor-col-resize transition-[width,background-color] duration-100 shrink-0"
          onMouseDown={(e) => {
            dragState.current = 'left';
            startX.current = e.clientX;
            startW.current = leftPanelW;
          }}
        />

        {/* Center — Map + Control Bar */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Middle Control Bar */}
          <div className="shrink-0 mx-3 my-2 px-4 py-2 flex items-center gap-3 flex-wrap border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-md">
            {/* Timeline Segmented Buttons */}
            <div className="flex" role="group" aria-label="Time range filter">
              {timelineOptions.map((opt, idx) => (
                <button
                  key={opt}
                  onClick={() => setTimeline(opt)}
                  className={cn(
                    'px-3 py-1.5 font-data text-xs font-medium transition-all border border-[var(--color-border)]',
                    timeline === opt
                      ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] z-10'
                      : 'bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]',
                    idx > 0 && '-ml-px'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block" />

            {/* Layer Visibility Toggles */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider mr-0.5">Show:</span>
              <button
                type="button"
                onClick={() => setShowVessels(!showVessels)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
                  showVessels
                    ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
                )}
              >
                <Ship className="h-3.5 w-3.5" />
                Vessels
              </button>
              <button
                type="button"
                onClick={() => setShowAircraft(!showAircraft)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
                  showAircraft
                    ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
                )}
              >
                <Plane className="h-3.5 w-3.5" />
                Aircraft
              </button>
              <button
                type="button"
                onClick={() => setShowConflicts(!showConflicts)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold transition-all border flex items-center gap-1',
                  showConflicts
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Conflicts
              </button>
            </div>

            <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block" />

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-bg)] font-ui text-xs text-[var(--color-fg)] cursor-pointer hover:border-[var(--color-primary-400)] transition-colors"
              aria-label="Severity filter"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-bg)] font-ui text-xs text-[var(--color-fg)] cursor-pointer hover:border-[var(--color-primary-400)] transition-colors"
              aria-label="Region filter"
            >
              <option value="all">All Regions</option>
              <option value="hormuz">Strait of Hormuz</option>
              <option value="pgulf">Persian Gulf</option>
              <option value="goman">Gulf of Oman</option>
              <option value="redsea">Red Sea</option>
            </select>

            {/* Heatmap Toggle */}
            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={cn(
                'px-3 py-1.5 font-ui text-xs font-semibold transition-all border flex items-center gap-1.5',
                showHeatmap
                  ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] '
                  : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
              )}
            >
              {showHeatmap ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showHeatmap ? 'Heatmap On' : 'Heatmap'}
            </button>

            {/* Metrics HUD Toggle */}
            <button
              type="button"
              onClick={() => setShowMetrics(!showMetrics)}
              className={cn(
                'px-3 py-1.5 font-ui text-xs font-semibold transition-all border flex items-center gap-1.5',
                showMetrics
                  ? 'bg-emerald-600 text-white border-emerald-600 '
                  : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              {showMetrics ? 'Metrics On' : 'Metrics'}
            </button>

            {/* Recenter Map Button */}
            <button
              type="button"
              onClick={() => setRecenterTrigger((prev) => prev + 1)}
              className="px-3 py-1.5 font-ui text-xs font-semibold transition-all border bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)] hover:text-[var(--color-fg)] flex items-center gap-1.5"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Recenter
            </button>

            <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block mx-1" />

            {/* Generate Report Button */}
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={reportGenerating}
              className={cn(
                'px-4 py-1.5 font-ui text-xs font-semibold transition-all border flex items-center gap-2',
                reportGenerating
                  ? 'bg-[var(--color-primary-600)]/10 text-[var(--color-primary-600)] border-[var(--color-primary-600)]/30 cursor-wait'
                  : 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] hover:border-[var(--color-primary-700)]'
              )}
              aria-label="Generate Intelligence Report"
            >
              {reportGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Generate Report
                </>
              )}
            </button>

            {/* Live Pipeline Processing Status HUD Strip */}
            <div className="w-full pt-2 mt-1 border-t border-[var(--color-border)]/50 flex items-center justify-between gap-2 text-[11px] font-mono overflow-x-auto flex-nowrap">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                  <Ship className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[var(--color-fg-subtle)] font-medium">AIS STREAM:</span>
                  <span className="font-bold text-emerald-400">{vesselCount > 0 ? `${vesselCount} VESSELS` : 'RECEIVING'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                  <Plane className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-[var(--color-fg-subtle)] font-medium">ADS-B AIR:</span>
                  <span className="font-bold text-sky-400">{aircraftCount > 0 ? `${aircraftCount} TRACKING` : 'STREAMING'}</span>
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                  <Rss className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[var(--color-fg-subtle)] font-medium">NEWS PIPELINE:</span>
                  <span className="font-bold text-indigo-400">{newsItems.length > 0 ? `${newsItems.length} ARTICLES` : 'SCRAPING'}</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                <Cpu className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[var(--color-fg-subtle)] font-medium">ANOMALY ML ENGINE:</span>
                <span className="font-bold text-amber-400">{displayMetrics?.totalTracks !== undefined ? `${displayMetrics.totalTracks} TRACKS` : 'ONLINE'}</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)]">
                  <Radio className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[var(--color-fg-subtle)] font-medium">FIRMS / GDELT:</span>
                  <span className="font-bold text-purple-400">INGESTION OK</span>
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-fg-muted)] pl-2 border-l border-[var(--color-border)] shrink-0">
                <Globe className="h-3 w-3 text-[var(--color-primary-400)] animate-spin-slow" />
                <span>MIDDLE EAST SECTOR (8.0°N–32.0°N, 32.0°E–76.0°E)</span>
              </div>
            </div>

            {/* Transit & Blockade Status Strip */}
            {blockade && (
              <div className="w-full pt-2 mt-1 border-t border-[var(--color-border)]/50 flex items-center gap-2 text-[11px] font-mono overflow-x-auto flex-nowrap">
                <div className={cn(
                  'px-2.5 py-1 border font-semibold flex items-center gap-1.5',
                  blockade.strait_status === 'ACTIVE' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                  blockade.strait_status === 'LIMITED' && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                  blockade.strait_status === 'NO_TRANSIT' && 'bg-red-500/10 border-red-500/30 text-red-400'
                )}>
                  <ShieldAlert className="h-3 w-3" />
                  {blockade.strait_status === 'NO_TRANSIT' ? 'NO TRANSIT' : blockade.strait_status}
                </div>
                <span className="text-[var(--color-fg-subtle)]">
                  Transits: <span className="font-bold text-[var(--color-fg)]">{blockade.strait_transits_24h}</span>
                </span>
                <span className="text-[var(--color-fg-subtle)]">
                  Anchored: <span className="font-bold text-[var(--color-fg)]">{blockade.anchored_ratio_pct?.toFixed(0)}%</span>
                </span>
                <span className="text-[var(--color-fg-subtle)]">
                  Waiting 6h+: <span className={cn('font-bold', blockade.waiting_fleet_6h > 10 ? 'text-amber-400' : 'text-[var(--color-fg)]')}>{blockade.waiting_fleet_6h}</span>
                </span>
                {transits?.recent_events && transits.recent_events.length > 0 && (
                  <span className="text-[var(--color-fg-muted)] ml-auto text-[10px]">
                    Latest: {transits.recent_events[0].ship_name || `MMSI ${transits.recent_events[0].mmsi}`}
                    {' · '}
                    {transits.recent_events[0].direction === 'INBOUND' ? '→ IN' : '← OUT'}
                    {' · '}
                    {transits.recent_events[0].gate}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="flex-1 px-1.5">
            <div className="relative h-[90%] w-full overflow-hidden border border-[var(--color-border)]">
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] font-ui text-sm">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--color-primary)]" />
                    Loading interactive tactical map...
                  </div>
                }
              >
                <LeafletMap
                  className="z-0"
                  heatmap={showHeatmap}
                  onHeatmapChange={setShowHeatmap}
                  showVessels={showVessels}
                  showAircraft={showAircraft}
                  showConflicts={showConflicts}
                  onShowConflictsChange={setShowConflicts}
                  showMetrics={showMetrics}
                  onShowMetricsChange={setShowMetrics}
                  recenterTrigger={recenterTrigger}
                  onHighlightReady={(fn) => {
                    highlightZoneRef.current = fn;
                  }}
                  timeline={timeline}
                  severityFilter={severityFilter}
                  regionFilter={regionFilter}
                />
              </Suspense>
            </div>
          </div>
        </main>

        {/* Resize handle: map | threats */}
        <div
          className="w-1 hover:w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-primary-600)] cursor-col-resize transition-[width,background-color] duration-100 shrink-0"
          onMouseDown={(e) => {
            dragState.current = 'right';
            startX.current = e.clientX;
            startW.current = rightPanelW;
          }}
        />

        {/* Right Threat Panel */}
        <div style={{ width: rightPanelW }} className="flex-shrink-0 overflow-hidden">
        <ThreatsPanel
          topThreats={topThreats}
          totalThreats={totalThreats}
          criticalCount={criticalCount}
          highCount={highCount}
          selectedThreat={selectedThreat}
          setSelectedThreat={setSelectedThreat}
          onHoverThreat={(t) => {
            if (t?.trackId) {
              setSearchParams({ trackId: t.trackId });
            }
          }}
        />
        </div>
      </div>
      )}

      {/* Tab: Intelligence */}
      {activeTab === 'intelligence' && (
        <IntelligenceDashboard />
      )}

      {/* Tab: Feed */}
      {activeTab === 'feed' && (
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Alerts + News */}
          <div className="lg:col-span-2 space-y-4">
            {/* Threats/Alerts list */}
            <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-[var(--color-primary-600)]" />
                <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Recent Alerts</span>
                <span className="ml-auto text-[10px] font-mono text-[var(--color-fg-muted)]">{topThreats.length} items</span>
              </div>
              <div className="space-y-0 max-h-[60vh] overflow-y-auto divide-y divide-[var(--color-border)]">
                {topThreats.slice(0, 20).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-2 text-[11px] first:pt-0">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      t.severity === 'critical' ? 'bg-red-500' : t.severity === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                    )} />
                    <span className="flex-1 truncate font-medium text-[var(--color-fg)]">{t.title}</span>
                    <span className="text-[var(--color-fg-muted)] shrink-0">{t.time}</span>
                  </div>
                ))}
                {topThreats.length === 0 && (
                  <div className="text-center text-xs text-[var(--color-fg-muted)] py-4">No active alerts</div>
                )}
              </div>
            </div>

            {/* News Articles */}
            <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="h-4 w-4 text-[var(--color-primary-600)]" />
                <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">News Feed</span>
                <span className="ml-auto text-[10px] font-mono text-[var(--color-fg-muted)]">{newsItems.length} articles</span>
              </div>
              <div className="space-y-0 max-h-[50vh] overflow-y-auto divide-y divide-[var(--color-border)]">
                {newsItems.slice(0, 15).map((a: any, i: number) => (
                  <div key={a.id || i} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold text-[var(--color-fg-muted)] uppercase">{a.source_name || a.metadata?.source || 'Source'}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--color-fg-muted)]" />
                      <span className="text-[10px] text-[var(--color-fg-muted)]">{a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</span>
                    </div>
                    <div className="text-xs font-semibold text-[var(--color-fg)]">{a.title}</div>
                    <div className="text-[11px] text-[var(--color-fg-muted)] line-clamp-2 mt-0.5">{a.summary || a.body?.substring(0, 200) || ''}</div>
                  </div>
                ))}
                {newsItems.length === 0 && (
                  <div className="text-center text-xs text-[var(--color-fg-muted)] py-4">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading articles...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Strait Status + Transits + Flags */}
          <div className="space-y-4">
            {/* Strait Status */}
            {blockade && (
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-[var(--color-primary-600)]" />
                  <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Strait Status</span>
                </div>
                <span className={cn('inline-block px-2.5 py-1 text-[10px] font-bold border',
                  blockade.strait_status === 'ACTIVE' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  blockade.strait_status === 'LIMITED' && 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                  blockade.strait_status === 'NO_TRANSIT' && 'bg-red-500/10 text-red-400 border-red-500/30'
                )}>{blockade.strait_status === 'NO_TRANSIT' ? 'NO TRANSIT' : blockade.strait_status}</span>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    { l: 'Waiting 6h', v: blockade.waiting_fleet_6h },
                    { l: 'Waiting 24h', v: blockade.waiting_fleet_24h },
                    { l: 'Anchored', v: `${blockade.anchored_vessels} (${blockade.anchored_ratio_pct?.toFixed(0)}%)` },
                    { l: 'Active', v: blockade.active_vessels },
                  ].map(r => (
                    <div key={r.l} className="p-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-center">
                      <div className="text-[10px] text-[var(--color-fg-muted)]">{r.l}</div>
                      <div className="font-mono text-sm font-bold text-[var(--color-fg)] mt-0.5">{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transits */}
            {transits && (
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Ship className="h-4 w-4 text-[var(--color-primary-600)]" />
                  <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Recent Transits</span>
                </div>
                <div className="space-y-0 divide-y divide-[var(--color-border)]">
                  {(transits.recent_events ?? []).slice(0, 10).map((evt, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] py-1.5 first:pt-0 last:pb-0">
                      <span className={cn('px-1 py-0.5 text-[10px] font-bold border',
                        evt.direction === 'INBOUND' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}>
                        {evt.direction === 'INBOUND' ? 'IN' : 'OUT'}
                      </span>
                      <span className="truncate flex-1 text-[var(--color-fg)]">{evt.ship_name || `MMSI ${evt.mmsi}`}</span>
                      <span className="text-[var(--color-fg-muted)]">{evt.flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threat Detail Modal */}
      <ThreatDetailModal
        selectedThreat={selectedThreat}
        onClose={() => setSelectedThreat(null)}
      />

      {/* Floating metrics panel — Map tab only */}
      {activeTab === 'map' && (
      <div className="absolute bottom-5 left-5 right-5 z-20 flex justify-center pointer-events-none md:bottom-18 md:left-8 md:right-8 lg:left-[calc(18rem+1.5rem)] lg:right-[calc(20rem+1.5rem)]">
        <div className="w-full max-w-5xl glass-card pointer-events-auto">
          <LiveStatStrip
            metrics={displayMetrics}
            isLoading={isLoading && !liveStats}
            onMetricClick={setSelectedMetric}
          />
        </div>
      </div>
      )}

      {/* Metric Detail Sheet */}
      <MetricDetailSheet
        selectedMetric={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        metrics={metrics}
      />

      {/* Settings Sheet */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cacheTelemetry={cacheTelemetry}
        setCacheTelemetry={setCacheTelemetry}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        reduceMotion={reduceMotion}
        setReduceMotion={setReduceMotion}
      />

      {/* Global Report Loader */}
      <ReportProgressModal show={reportGenerating} />
    </div>
  );
}

export default HomePage;
