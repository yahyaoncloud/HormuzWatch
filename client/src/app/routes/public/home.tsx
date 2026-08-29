import { BarChart3, Globe, Newspaper } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import { LiveStatStrip, type MetricKey } from '@/components/data/LiveStatStrip';
import { IntelligenceDashboard } from '@/components/intelligence/IntelligenceDashboard';
import { MetricDetailSheet } from '@/components/intelligence/MetricDetailSheet';
import { ReportProgressModal } from '@/components/intelligence/ReportProgressModal';
import { SettingsSheet } from '@/components/intelligence/SettingsSheet';
import { ThreatDetailModal, type ThreatItem } from '@/components/intelligence/ThreatsPanel';
import { DisclaimerModal } from '@/components/ui/DisclaimerModal';
import { DesktopOnlyOverlay } from '@/components/ui/DesktopOnlyOverlay';
import { HomeTopBar } from '@/components/home/HomeTopBar';
import { HomeMapLayout, HomeFeedView } from '@/components/home/HomePanels';
import { useHomeTelemetry } from '@/components/home/useHomeTelemetry';
import {
  getDetailedReport,
  getDetailedReportPDF,
  getNews,
  getPublicMetrics,
  getServerSettings,
  getTopTraces,
} from '@/lib/api';
import { useUIStore } from '@/stores';
import { env } from "@/environments/environment";

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

const TIMELINE_OPTIONS = ['1hr', '3hr', '6hr', '12hr', '24hr', 'all'] as const;

const TABS = [
  { id: 'map' as const, label: 'Map', icon: Globe },
  { id: 'intelligence' as const, label: 'Intelligence', icon: BarChart3 },
  { id: 'feed' as const, label: 'Feed', icon: Newspaper },
];

export type TimelineOption = '1hr' | '3hr' | '6hr' | '12hr' | '24hr' | 'all';

export function HomePage() {
  const loaderData = useLoaderData<typeof clientLoader>();
  const addToast = useUIStore((s) => s.addToast);
  const [_searchParams, setSearchParams] = useSearchParams();

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'map' | 'intelligence' | 'feed'>(() => {
    if (typeof window === 'undefined') return 'map';
    return (localStorage.getItem('hw-active-tab') as any) || 'map';
  });

  // Timeline & Filters
  const [timeline, setTimeline] = useState<TimelineOption>(() => {
    if (typeof window === 'undefined') return 'all';
    return (localStorage.getItem('hw-timeline-filter') as TimelineOption) || 'all';
  });
  const [severityFilter, setSeverityFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return localStorage.getItem('hw-severity-filter') || 'all';
  });
  const [regionFilter, setRegionFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    const param = new URLSearchParams(window.location.search).get('region');
    if (param) return param;
    return localStorage.getItem('hw-region-filter') || 'all';
  });

  const handleRegionFilterChange = useCallback((region: string) => {
    setRegionFilter(region);
    try {
      localStorage.setItem('hw-region-filter', region);
    } catch {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (region && region !== 'all') {
        next.set('region', region);
      } else {
        next.delete('region');
      }
      return next;
    });
  }, [setSearchParams]);

  // Layer Toggles
  const [showHeatmap, setShowHeatmap] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hw-show-heatmap') === '1';
  });
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
  const [showConflicts, setShowConflicts] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('hw-show-conflicts') !== '0'
  );
  const [showAreas, setShowAreas] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('hw-show-areas') !== '0'
  );
  const [showMetrics, setShowMetrics] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('hw-show-metrics') !== '0'
  );
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('hw-reduce-motion') === '1'
  );

  // Drag-resize panel widths
  const [leftPanelW, setLeftPanelW] = useState(240);
  const [rightPanelW, setRightPanelW] = useState(288);
  const dragState = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  // Modals and sheets
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<ThreatItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cacheTelemetry, setCacheTelemetry] = useState(true);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const highlightZoneRef = useRef<((id: string | null) => void) | null>(null);

  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hw-disclaimer-dismissed') !== '1';
  });

  // Telemetry Hook reacting dynamically to layer toggles
  const {
    metrics,
    isMetricsLoading,
    topThreats,
    newsItems,
    blockade,
    transits,
    criticalCount,
    highCount,
    totalThreats,
    vesselCount,
    aircraftCount,
    systemHealth,
    wsStatus,
    latestLogs,
  } = useHomeTelemetry({
    initialMetrics: loaderData?.initialMetrics ?? undefined,
    initialTraces: loaderData?.initialTraces ?? undefined,
    initialNews: loaderData?.initialNews ?? undefined,
    severityFilter,
    regionFilter,
    timeline,
    showVessels,
    showAircraft,
    showConflicts,
    showAreas,
    showMetrics,
  });

  // Settings & effects
  useEffect(() => {
    getServerSettings()
      .then((s) => setCacheTelemetry(s.cache_telemetry_findings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    try {
      window.localStorage.setItem('hw-reduce-motion', reduceMotion ? '1' : '0');
      window.localStorage.setItem('hw-show-heatmap', showHeatmap ? '1' : '0');
      window.localStorage.setItem('hw-show-vessels', showVessels ? '1' : '0');
      window.localStorage.setItem('hw-show-aircraft', showAircraft ? '1' : '0');
      window.localStorage.setItem('hw-show-conflicts', showConflicts ? '1' : '0');
      window.localStorage.setItem('hw-show-areas', showAreas ? '1' : '0');
      window.localStorage.setItem('hw-show-metrics', showMetrics ? '1' : '0');
      window.localStorage.setItem('hw-timeline-filter', timeline);
      window.localStorage.setItem('hw-severity-filter', severityFilter);
      window.localStorage.setItem('hw-region-filter', regionFilter);
    } catch {}
  }, [showHeatmap, showVessels, showAircraft, showConflicts, showAreas, showMetrics, timeline, severityFilter, regionFilter, reduceMotion]);

  // Resizing mouse move handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const delta = e.clientX - startX.current;
      const newW = startW.current + (dragState.current === 'left' ? delta : -delta);
      const clamped = Math.max(
        dragState.current === 'left' ? 200 : 240,
        Math.min(dragState.current === 'left' ? 400 : 500, newW)
      );
      if (dragState.current === 'left') setLeftPanelW(clamped);
      else setRightPanelW(clamped);
    };
    const onUp = () => {
      dragState.current = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleDragStart = (handle: 'left' | 'right', clientX: number, width: number) => {
    dragState.current = handle;
    startX.current = clientX;
    startW.current = width;
  };

  // Report generation handler
  const handleGenerateReport = useCallback(async () => {
    setReportGenerating(true);
    addToast({
      type: 'info',
      title: 'Processing',
      message: 'Analyzing database traces and starting LaTeX compilation...',
    });
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

      addToast({
        type: 'success',
        title: 'Success',
        message: 'Intelligence PDF report compiled and downloaded successfully.',
      });
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      const errorMsg = error?.message || 'Check your internet connection or credits.';
      addToast({ type: 'error', title: 'Failure', message: `Failed to generate report: ${errorMsg}` });
    } finally {
      setReportGenerating(false);
    }
  }, [addToast]);

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col bg-[var(--color-bg)]">
      {/* Mobile view desktop overlay blocker */}
      <DesktopOnlyOverlay title="Live Operations & Command" subtitle="Desktop View Required" />

      {/* Disclaimer Modal */}
      <DisclaimerModal
        open={showDisclaimer}
        onClose={() => {
          setShowDisclaimer(false);
          try {
            localStorage.setItem('hw-disclaimer-dismissed', '1');
          } catch {}
        }}
      />

      {/* Top Header and Controls */}
      <HomeTopBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          try {
            localStorage.setItem('hw-active-tab', tab);
          } catch {}
        }}
        timelineOptions={TIMELINE_OPTIONS}
        timeline={timeline}
        onTimelineChange={setTimeline}
        severityFilter={severityFilter}
        onSeverityFilterChange={setSeverityFilter}
        regionFilter={regionFilter}
        onRegionFilterChange={handleRegionFilterChange}
        showVessels={showVessels}
        onToggleVessels={() => setShowVessels(!showVessels)}
        showAircraft={showAircraft}
        onToggleAircraft={() => setShowAircraft(!showAircraft)}
        showConflicts={showConflicts}
        onToggleConflicts={() => setShowConflicts(!showConflicts)}
        showAreas={showAreas}
        onToggleAreas={() => setShowAreas(!showAreas)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        showMetrics={showMetrics}
        onToggleMetrics={() => setShowMetrics(!showMetrics)}
        onRecenter={() => setRecenterTrigger((p) => p + 1)}
        onGenerateReport={handleGenerateReport}
        reportGenerating={reportGenerating}
        vesselCount={vesselCount}
        aircraftCount={aircraftCount}
        newsCount={newsItems.length}
        totalTracks={metrics?.totalTracks}
        blockade={blockade}
        transits={transits}
        systemHealth={systemHealth}
        wsStatus={wsStatus}
        latestLogs={latestLogs}
      />

      {/* View: Map */}
      {activeTab === 'map' && (
        <div className="flex-1 min-h-0 relative w-full overflow-hidden">
          <HomeMapLayout
            leftPanelW={leftPanelW}
            rightPanelW={rightPanelW}
            onDragStart={handleDragStart}
            highlightZoneRef={highlightZoneRef}
            newsItems={newsItems}
            topThreats={topThreats}
            totalThreats={totalThreats}
            criticalCount={criticalCount}
            highCount={highCount}
            selectedThreat={selectedThreat}
            onSelectThreat={setSelectedThreat}
            onHoverThreat={(t) => {
              if (t?.trackId) setSearchParams({ trackId: t.trackId });
            }}
            showHeatmap={showHeatmap}
            onHeatmapChange={setShowHeatmap}
            showVessels={showVessels}
            showAircraft={showAircraft}
            showConflicts={showConflicts}
            onShowConflictsChange={setShowConflicts}
            showAreas={showAreas}
            showMetrics={showMetrics}
            onShowMetricsChange={setShowMetrics}
            recenterTrigger={recenterTrigger}
            timeline={timeline}
            severityFilter={severityFilter}
            regionFilter={regionFilter}
            onRegionFilterChange={handleRegionFilterChange}
          />

          {/* Floating metrics panel (toggled via Show: Metrics button) */}
          {showMetrics && (
            <div className="absolute bottom-3 left-5 right-5 z-20 flex justify-center pointer-events-none md:bottom-4 md:left-8 md:right-8 lg:left-[calc(18rem+1.5rem)] lg:right-[calc(20rem+1.5rem)]">
              <div className="w-full max-w-5xl glass-card pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
                <LiveStatStrip
                  metrics={metrics}
                  isLoading={isMetricsLoading}
                  onMetricClick={setSelectedMetric}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* View: Intelligence */}
      {activeTab === 'intelligence' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <IntelligenceDashboard />
        </div>
      )}

      {/* View: Feed */}
      {activeTab === 'feed' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <HomeFeedView
            topThreats={topThreats}
            newsItems={newsItems}
            blockade={blockade}
            transits={transits}
          />
        </div>
      )}

      {/* Modals & Detail Sheets */}
      <ThreatDetailModal selectedThreat={selectedThreat} onClose={() => setSelectedThreat(null)} />
      <MetricDetailSheet
        selectedMetric={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        metrics={metrics}
      />
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
      <ReportProgressModal show={reportGenerating} />
    </div>
  );
}

export default HomePage;
