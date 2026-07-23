import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData } from 'react-router';
import { LiveStatStrip, type MetricKey } from '@/components/data/LiveStatStrip';
import {
  IntelligenceConsole,
  formatTimeAgo,
} from '@/components/intelligence/IntelligenceConsole';
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
} from '@/lib/api';
import { cn } from '@/utils/cn';
import { env } from "@/environments/environment";

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

export function HomePage() {
  const loaderData = useLoaderData<typeof clientLoader>();

  const { data, isLoading } = useQuery({
    queryKey: ['public-metrics-home'],
    queryFn: getPublicMetrics,
    initialData: loaderData?.initialMetrics ?? undefined,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: tracesData } = useQuery({
    queryKey: ['public-traces-home'],
    queryFn: getTopTraces,
    initialData: loaderData?.initialTraces ?? undefined,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: newsData } = useQuery({
    queryKey: ['public-news-feed'],
    queryFn: getNews,
    initialData: loaderData?.initialNews ?? undefined,
    refetchInterval: 60000,
  });

  const metrics = data?.metrics;
  const liveTraces = tracesData?.traces ?? [];
  const newsItems = newsData?.news ?? [];

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('hw-reduce-motion') === '1'
  );
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('hw-sidebar-expand-all');
    return saved === null ? true : saved === '1';
  });

  const toggleSidebarExpand = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hw-sidebar-expand-all', next ? '1' : '0');
      }
      return next;
    });
  };

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

  const highlightZoneRef = useRef<((id: string | null) => void) | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<ThreatItem | null>(null);

  // Timeline & filter state
  const [timeline, setTimeline] = useState<'1hr' | '3hr' | '6hr' | '12hr' | '24hr' | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Report generation state
  const [reportGenerating, setReportGenerating] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>
  >([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
    showToast('info', 'Analyzing database traces and starting LaTeX compilation...');
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

      showToast('success', 'Intelligence PDF report compiled and downloaded successfully.');
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      const errorMsg = error?.message || 'Check your internet connection or credits.';
      showToast('error', `Failed to generate report: ${errorMsg}`);
    } finally {
      setReportGenerating(false);
    }
  }, [showToast]);

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

      {/* Main layout */}
      <div className="absolute inset-0 flex">
        {/* Left Console */}
        <IntelligenceConsole
          sidebarExpanded={sidebarExpanded}
          toggleSidebarExpand={toggleSidebarExpand}
          highlightZone={(id) => highlightZoneRef.current?.(id)}
          newsItems={newsItems}
          metrics={metrics}
        />

        {/* Center — Map + Control Bar */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Middle Control Bar */}
          <div className="shrink-0 mx-3 my-2 px-4 py-2 flex items-center gap-3 flex-wrap border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-card)]/80 backdrop-blur-md">
            {/* Timeline Segmented Buttons */}
            <div className="flex" role="group" aria-label="Time range filter">
              {timelineOptions.map((opt, idx) => (
                <button
                  key={opt}
                  onClick={() => setTimeline(opt)}
                  className={cn(
                    'px-3 py-1.5 font-data text-xs font-medium transition-all border border-[var(--color-border)]',
                    idx === 0 && 'rounded-l-lg',
                    idx === timelineOptions.length - 1 && 'rounded-r-lg',
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

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] font-ui text-xs text-[var(--color-fg)] cursor-pointer hover:border-[var(--color-primary-400)] transition-colors"
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
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] font-ui text-xs text-[var(--color-fg)] cursor-pointer hover:border-[var(--color-primary-400)] transition-colors"
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
                'ml-auto px-3 py-1.5 rounded-lg font-ui text-xs font-medium transition-colors border',
                showHeatmap
                  ? 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/30'
                  : 'bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-primary-400)]'
              )}
            >
              {showHeatmap ? 'Heatmap On' : 'Heatmap'}
            </button>

            <div className="w-px h-5 bg-[var(--color-border)] hidden sm:block mx-2" />

            {/* Generate Report Button */}
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={reportGenerating}
              className={cn(
                'px-4 py-1.5 rounded-lg font-ui text-xs font-semibold transition-all border flex items-center gap-2',
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
          </div>

          {/* Map Container */}
          <div className="flex-1 min-h-0 px-1.5 pb-3">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--color-border)]">
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

        {/* Right Threat Panel */}
        <ThreatsPanel
          topThreats={topThreats}
          totalThreats={totalThreats}
          criticalCount={criticalCount}
          highCount={highCount}
          selectedThreat={selectedThreat}
          setSelectedThreat={setSelectedThreat}
        />
      </div>

      {/* Threat Detail Modal */}
      <ThreatDetailModal
        selectedThreat={selectedThreat}
        onClose={() => setSelectedThreat(null)}
      />

      {/* Floating metrics panel */}
      <div className="absolute bottom-5 left-5 right-5 z-20 flex justify-center pointer-events-none sm:bottom-8 sm:left-8 sm:right-8 lg:left-[calc(18rem+1.5rem)] lg:right-[calc(20rem+1.5rem)]">
        <div className="w-full max-w-5xl glass-card rounded-xl pointer-events-auto">
          <LiveStatStrip
            metrics={metrics}
            isLoading={isLoading}
            onMetricClick={setSelectedMetric}
          />
        </div>
      </div>

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

      {/* Toasts Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 bg-[var(--color-bg-card)]/90',
              t.type === 'success' && 'border-green-500/30 text-green-500',
              t.type === 'error' && 'border-red-500/30 text-red-500',
              t.type === 'info' &&
                'border-[var(--color-primary-600)]/30 text-[var(--color-primary-600)]'
            )}
            role="alert"
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="h-5 w-5 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <p className="font-ui text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                {t.type === 'success' ? 'Success' : t.type === 'error' ? 'Failure' : 'Processing'}
              </p>
              <p className="mt-0.5 font-ui text-sm text-[var(--color-fg)]">{t.message}</p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-0.5 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Report Loader */}
      <ReportProgressModal show={reportGenerating} />
    </div>
  );
}

export default HomePage;
