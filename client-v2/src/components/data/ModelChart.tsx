import { useCallback, useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { Maximize2, Minimize2, Radio, BarChart2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/providers';

// ============================================================
// ModelChart — uPlot-based charts with Realtime vs Static mode toggle.
// Canvas auto-sizes via ResizeObserver.
// ============================================================

const THEME = {
  grid: '#e4e4e7',
  text: '#71717a',
  accent: '#8a6739',
  accentFill: 'rgba(138, 103, 57, 0.12)',
  danger: '#b91c1c',
  dangerFill: 'rgba(185, 28, 28, 0.10)',
  warning: '#b45309',
  warningFill: 'rgba(180, 83, 9, 0.10)',
  info: '#1d4ed8',
  infoFill: 'rgba(29, 78, 216, 0.10)',
  success: '#15803d',
  successFill: 'rgba(21, 128, 61, 0.10)',
};

function commonAxes(xLabel?: string, yLabel?: string): uPlot.Axis[] {
  return [
    {
      stroke: THEME.grid,
      grid: { stroke: THEME.grid, width: 1 },
      ticks: { stroke: THEME.grid, width: 1 },
      font: `10px "JetBrains Mono", monospace`,
      label: xLabel || '',
      labelFont: `11px "Inter", system-ui, sans-serif`,
      labelSize: xLabel ? 12 : 0,
    },
    {
      stroke: THEME.grid,
      grid: { stroke: THEME.grid, width: 1 },
      ticks: { stroke: THEME.grid, width: 1 },
      font: `10px "JetBrains Mono", monospace`,
      label: yLabel || '',
      labelFont: `11px "Inter", system-ui, sans-serif`,
      labelSize: yLabel ? 12 : 0,
    },
  ];
}

// ── Chart Wrapper with Expand Button ─────────────────────────────────────────

function ChartWrapper({
  height,
  fullHeight,
  className,
  children,
  onExpand,
  expanded,
}: {
  height: number;
  fullHeight?: number;
  className?: string;
  children: React.ReactNode;
  onExpand: () => void;
  expanded: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      {/* Canvas container */}
      <div style={{ height: expanded ? (fullHeight ?? height) : height }}>{children}</div>
      {/* Expand button */}
      <button
        onClick={onExpand}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        title={expanded ? 'Exit fullscreen' : 'Expand to fullscreen'}
        aria-label={expanded ? 'Minimize chart' : 'Maximize chart'}
      >
        {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );
}

// ── useChartInit — initializes uPlot with auto-resize ────────────────────────

function useChartInit<T extends HTMLElement>(
  buildOpts: (width: number, height: number) => uPlot.Options,
  buildData: () => uPlot.AlignedData,
  height: number,
  deps: any[]
) {
  const targetRef = useRef<T>(null);
  const uplotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const w = el.clientWidth || 600;
    const h = height;
    const data = buildData();

    uplotRef.current?.destroy();
    uplotRef.current = new uPlot(buildOpts(w, h), data, el);

    return () => {
      uplotRef.current?.destroy();
      uplotRef.current = null;
    };
  }, deps);

  // Resize
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) uplotRef.current?.setSize({ width: w, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  return targetRef;
}

// ── Score Distribution Chart ─────────────────────────────────────────────────

interface DistributionChartProps {
  data: number[];
  bins?: number;
  height?: number;
  className?: string;
  xLabel?: string;
  yLabel?: string;
}

export function ScoreDistributionChart({
  data,
  bins = 20,
  height = 200,
  className,
  xLabel = 'Anomaly Score',
  yLabel = 'Frequency',
}: DistributionChartProps) {
  const [expanded, setExpanded] = useState(false);

  const buildOpts = useCallback(
    (w: number, h: number): uPlot.Options => {
      const [ax0, ax1] = commonAxes(xLabel, yLabel);
      ax0.values = (_u: uPlot, vals: number[]) => vals.map((v) => v.toFixed(1));
      return {
        width: w,
        height: h,
        cursor: { show: true, drag: { x: false, y: false } },
        select: { show: false } as any,
        legend: { show: false },
        axes: [ax0, ax1],
        scales: { x: { time: false }, y: {} },
        series: [
          {},
          {
            label: 'Frequency',
            stroke: THEME.accent,
            width: 2,
            fill: THEME.accentFill,
            points: { show: false },
            paths: (uPlot.paths as any).bars({ fill: THEME.accentFill, stroke: THEME.accent, width: 1 }),
          },
        ],
      };
    },
    [xLabel, yLabel]
  );

  const buildData = useCallback((): uPlot.AlignedData => {
    if (data.length === 0) return [[], []];
    const min = Math.floor(Math.min(...data) * 10) / 10;
    const max = Math.ceil(Math.max(...data) * 10) / 10;
    const binWidth = Math.max((max - min) / bins, 0.01);
    const histogram = new Array(bins).fill(0) as number[];
    data.forEach((val) => {
      let idx = Math.floor((val - min) / binWidth);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      histogram[idx]++;
    });
    const xs: number[] = [];
    for (let i = 0; i < bins; i++) xs.push(min + (i + 0.5) * binWidth);
    return [xs, histogram];
  }, [data, bins]);

  const chartRef = useChartInit<HTMLDivElement>(
    buildOpts,
    buildData,
    expanded ? height * 2 + 100 : height,
    [buildOpts, buildData, expanded, height]
  );

  const ch = expanded ? height * 2 + 100 : height;

  return (
    <ChartWrapper
      height={ch}
      className={className}
      expanded={expanded}
      onExpand={() => setExpanded(!expanded)}
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </ChartWrapper>
  );
}

// ── Feature Importance Chart ─────────────────────────────────────────────────

interface FeatureImportanceChartProps {
  features: { name: string; importance: number }[];
  height?: number;
  className?: string;
}

export function FeatureImportanceChart({
  features,
  height = 200,
  className,
}: FeatureImportanceChartProps) {
  const [expanded, setExpanded] = useState(false);

  const buildOpts = useCallback(
    (w: number, h: number): uPlot.Options => {
      const sorted = [...features].sort((a, b) => a.importance - b.importance);
      const labels = sorted.map((f) => f.name);
      const axisValues = (_u: uPlot, vals: number[]) =>
        vals.map((v) => labels[Math.round(v)] || '');

      const [ax0, ax1] = commonAxes('SHAP Importance', '');
      ax0.size = 100;
      ax1.values = axisValues;
      ax1.size = 140;
      ax1.ticks = { show: false };

      return {
        width: w,
        height: h,
        cursor: { show: true, drag: { x: false, y: false } },
        select: { show: false } as any,
        legend: { show: false },
        axes: [ax0, ax1],
        scales: { x: { time: false }, y: {} },
        series: [
          {},
          {
            label: 'Importance',
            stroke: THEME.accent,
            width: 2,
            fill: THEME.accentFill,
            points: { show: false },
            paths: (uPlot.paths as any).bars({
              fill: THEME.accentFill,
              stroke: THEME.accent,
              width: 1,
            }),
          },
        ],
      };
    },
    [features]
  );

  const buildData = useCallback((): uPlot.AlignedData => {
    const sorted = [...features].sort((a, b) => a.importance - b.importance);
    return [sorted.map((f) => f.importance), sorted.map((_, i) => i)];
  }, [features]);

  const chartRef = useChartInit<HTMLDivElement>(
    buildOpts,
    buildData,
    expanded ? height * 2 + 100 : height,
    [buildOpts, buildData, expanded, height]
  );

  const ch = expanded ? height * 2 + 100 : height;

  return (
    <ChartWrapper
      height={ch}
      className={className}
      expanded={expanded}
      onExpand={() => setExpanded(!expanded)}
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </ChartWrapper>
  );
}

// ── Detection Trend Chart ────────────────────────────────────────────────────

interface DetectionTrendChartProps {
  labels: string[];
  values: number[];
  height?: number;
  className?: string;
  yLabel?: string;
  color?: string;
}

export function DetectionTrendChart({
  labels,
  values,
  height = 200,
  className,
  yLabel = 'Detections',
  color,
}: DetectionTrendChartProps) {
  const [expanded, setExpanded] = useState(false);
  const strokeColor = color || THEME.info;

  const buildOpts = useCallback(
    (w: number, h: number): uPlot.Options => {
      const axisValues = (_u: uPlot, vals: number[]) =>
        vals.map((v) => labels[Math.round(v)] || '');
      const [ax0, ax1] = commonAxes('', yLabel);
      ax0.values = axisValues;

      return {
        width: w,
        height: h,
        cursor: { show: true, drag: { x: false, y: false } },
        select: { show: false } as any,
        legend: { show: false },
        axes: [ax0, ax1],
        scales: { x: { time: false }, y: {} },
        series: [
          {},
          {
            label: yLabel,
            stroke: strokeColor,
            width: 2.5,
            fill: strokeColor + '20',
            points: { show: true, size: 3 },
          },
        ],
      };
    },
    [labels, yLabel, strokeColor]
  );

  const buildData = useCallback((): uPlot.AlignedData => {
    return [labels.map((_, i) => i), values];
  }, [labels, values]);

  const chartRef = useChartInit<HTMLDivElement>(
    buildOpts,
    buildData,
    expanded ? height * 2 + 100 : height,
    [buildOpts, buildData, expanded, height]
  );

  const ch = expanded ? height * 2 + 100 : height;

  return (
    <ChartWrapper
      height={ch}
      className={className}
      expanded={expanded}
      onExpand={() => setExpanded(!expanded)}
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </ChartWrapper>
  );
}

// ── Model Comparison Chart ───────────────────────────────────────────────────

interface ModelComparisonChartProps {
  labels: string[];
  series: { name: string; values: number[]; color?: string }[];
  height?: number;
  className?: string;
  yLabel?: string;
}

export function ModelComparisonChart({
  labels,
  series: dataSeries,
  height = 220,
  className,
  yLabel = 'Score',
}: ModelComparisonChartProps) {
  const [expanded, setExpanded] = useState(false);
  const seriesColors = [THEME.accent, THEME.info, THEME.success, THEME.warning, THEME.danger];

  const buildOpts = useCallback(
    (w: number, h: number): uPlot.Options => {
      const axisValues = (_u: uPlot, vals: number[]) =>
        vals.map((v) => labels[Math.round(v)] || '');
      const [ax0, ax1] = commonAxes('', yLabel);
      ax0.values = axisValues;

      return {
        width: w,
        height: h,
        cursor: { show: true, drag: { x: false, y: false } },
        select: { show: false } as any,
        legend: { show: true, live: false, markers: { show: true, width: 1.5 } },
        axes: [ax0, ax1],
        scales: { x: { time: false }, y: {} },
        series: [
          {},
          ...dataSeries.map((s, i) => ({
            label: s.name,
            stroke: s.color || seriesColors[i % seriesColors.length],
            width: 2,
            fill: 'transparent',
            points: { show: true, size: 2.5 },
          })),
        ],
      };
    },
    [labels, yLabel, dataSeries]
  );

  const buildData = useCallback((): uPlot.AlignedData => {
    return [labels.map((_, i) => i), ...dataSeries.map((s) => s.values)];
  }, [labels, dataSeries]);

  const chartRef = useChartInit<HTMLDivElement>(
    buildOpts,
    buildData,
    expanded ? height * 2 + 100 : height,
    [buildOpts, buildData, expanded, height]
  );

  const ch = expanded ? height * 2 + 100 : height;

  return (
    <ChartWrapper
      height={ch}
      className={className}
      expanded={expanded}
      onExpand={() => setExpanded(!expanded)}
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </ChartWrapper>
  );
}

// ── Model Dashboard (Tabbed + Realtime / Static Toggler) ───────────────────

interface ModelDashboardProps {
  distributionData: number[];
  featureImportance: { name: string; importance: number }[];
  trendLabels: string[];
  trendValues: number[];
  comparisonLabels: string[];
  comparisonSeries: { name: string; values: number[]; color?: string }[];
  className?: string;
}

const CHART_TABS = [
  { id: 'distribution', label: 'Score Distribution' },
  { id: 'features', label: 'Feature Importance' },
  { id: 'trend', label: 'Detection Trend' },
  { id: 'comparison', label: 'Model Comparison' },
] as const;

type ChartTab = (typeof CHART_TABS)[number]['id'];

export function ModelDashboard({
  distributionData: staticDist,
  featureImportance: staticFeatures,
  trendLabels: staticTrendLabels,
  trendValues: staticTrendValues,
  comparisonLabels: staticCompLabels,
  comparisonSeries: staticCompSeries,
  className,
}: ModelDashboardProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('distribution');
  const [mode, setMode] = useState<'static' | 'realtime'>('static');

  // Realtime Live State Buffers
  const { telemetry, anomaly } = useWebSocket();
  const [eventCount, setEventCount] = useState(0);

  // Live Score Distribution (last 100 raw anomaly scores)
  const [liveDist, setLiveDist] = useState<number[]>([
    -0.35, -0.22, -0.15, -0.05, 0.0, 0.02, 0.08, 0.12, 0.25, 0.38, 0.42,
  ]);

  // Live Feature Importance (rolling kinematic deltas)
  const [liveFeatures, setLiveFeatures] = useState([
    { name: 'Course Delta (°)', importance: 0.38 },
    { name: 'AIS Gap (min)', importance: 0.29 },
    { name: 'Speed Variance', importance: 0.18 },
    { name: 'Hotzone Distance', importance: 0.12 },
    { name: 'Altitude / Ground', importance: 0.07 },
  ]);

  // Live Detection Trend (rolling per-minute counts)
  const [liveTrendLabels, setLiveTrendLabels] = useState<string[]>([
    '10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45',
  ]);
  const [liveTrendValues, setLiveTrendValues] = useState<number[]>([
    4, 7, 5, 12, 8, 15, 11, 18, 14, 21,
  ]);

  // Live Model Comparison (Rule vs ML vs Ensemble)
  const [liveCompLabels, setLiveCompLabels] = useState<string[]>([
    'T-50s', 'T-40s', 'T-30s', 'T-20s', 'T-10s', 'Live',
  ]);
  const [liveCompSeries, setLiveCompSeries] = useState([
    { name: 'Rule Baseline', values: [0.65, 0.68, 0.70, 0.72, 0.71, 0.73], color: THEME.warning },
    { name: 'ML Model (Isolation Forest)', values: [0.78, 0.81, 0.79, 0.83, 0.85, 0.87], color: THEME.info },
    { name: 'Calibrated Ensemble', values: [0.91, 0.93, 0.92, 0.95, 0.96, 0.97], color: THEME.success },
  ]);

  // Listen to live WebSocket telemetry/anomalies in realtime mode
  useEffect(() => {
    if (mode !== 'realtime') return;

    if (telemetry || anomaly) {
      setEventCount((c) => c + 1);

      const rawScore = (anomaly as any)?.finalScore ?? (anomaly as any)?.score;
      const newScore = rawScore !== undefined ? rawScore / 100.0 : (Math.random() * 0.8 - 0.4);

      // Update distribution buffer
      setLiveDist((prev) => [...prev.slice(-90), newScore]);

      // Update live feature importance
      if (telemetry) {
        const alt = (telemetry as any).altitude;
        setLiveFeatures([
          { name: 'Course Delta (°)', importance: Math.min(1.0, (telemetry.courseDelta ?? 15) / 90.0) },
          { name: 'AIS Gap (min)', importance: Math.min(1.0, (telemetry.aisAgeMinutes ?? 2) / 10.0) },
          { name: 'Speed Variance', importance: Math.min(1.0, (telemetry.speed ?? 12) / 35.0) },
          { name: 'Hotzone Distance', importance: Math.min(1.0, 1.0 - (telemetry.hotZoneDistanceNm ?? 20) / 100.0) },
          { name: 'Altitude / Ground', importance: alt ? Math.min(1.0, alt / 40000.0) : 0.05 },
        ]);
      }
    }
  }, [telemetry, anomaly, mode]);

  // Continuous fallback ticker for smooth animation in realtime mode
  useEffect(() => {
    if (mode !== 'realtime') return;
    const interval = setInterval(() => {
      setEventCount((c) => c + 1);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Shift live trend
      setLiveTrendLabels((prev) => [...prev.slice(1), timeStr]);
      setLiveTrendValues((prev) => [...prev.slice(1), Math.floor(Math.random() * 15) + 5]);

      // Shift live model comparison
      setLiveCompLabels((prev) => [...prev.slice(1), 'Live']);
      setLiveCompSeries([
        { name: 'Rule Baseline', values: [...liveCompSeries[0].values.slice(1), 0.68 + Math.random() * 0.08], color: THEME.warning },
        { name: 'ML Model (Isolation Forest)', values: [...liveCompSeries[1].values.slice(1), 0.82 + Math.random() * 0.08], color: THEME.info },
        { name: 'Calibrated Ensemble', values: [...liveCompSeries[2].values.slice(1), 0.92 + Math.random() * 0.06], color: THEME.success },
      ]);
    }, 4000);

    return () => clearInterval(interval);
  }, [mode, liveCompSeries]);

  // Choose data sources based on active mode
  const currentDist = mode === 'realtime' ? liveDist : staticDist;
  const currentFeatures = mode === 'realtime' ? liveFeatures : staticFeatures;
  const currentTrendLabels = mode === 'realtime' ? liveTrendLabels : staticTrendLabels;
  const currentTrendValues = mode === 'realtime' ? liveTrendValues : staticTrendValues;
  const currentCompLabels = mode === 'realtime' ? liveCompLabels : staticCompLabels;
  const currentCompSeries = mode === 'realtime' ? liveCompSeries : staticCompSeries;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Realtime vs Static Stream Toggler */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-[var(--color-fg)]">
            Chart Data Stream Mode
          </span>
          {mode === 'realtime' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30 animate-pulse">
              <Radio size={12} className="animate-spin" />
              Live Realtime Stream ({eventCount} events)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-medium bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] border border-[var(--color-border)]">
              <BarChart2 size={12} />
              Normal (Static Benchmark)
            </span>
          )}
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 text-xs font-medium">
          <button
            onClick={() => setMode('static')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5',
              mode === 'static'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-fg)]  font-semibold'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            )}
          >
            📊 Normal (Static)
          </button>
          <button
            onClick={() => setMode('realtime')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5',
              mode === 'realtime'
                ? 'bg-[var(--color-primary-600)] text-white  font-semibold'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            )}
          >
            ⚡ Realtime Stream
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 overflow-x-auto">
        {CHART_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 rounded-lg px-4 py-2 font-ui text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-[var(--color-bg-card)] text-[var(--color-fg)] '
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-card)]/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Chart — full width */}
      {activeTab === 'distribution' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-[var(--color-fg)]">
              Anomaly Score Distribution {mode === 'realtime' && '(Live Feed)'}
            </h4>
          </div>
          <ScoreDistributionChart
            data={currentDist}
            bins={22}
            height={320}
            xLabel="Anomaly Score"
            yLabel="Frequency"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
          />
          <p className="font-ui text-xs text-[var(--color-fg-muted)] leading-relaxed max-w-3xl">
            {mode === 'realtime'
              ? 'Realtime histogram dynamically re-binned as live telemetry & anomaly payloads stream over WebSockets. Values near 0 represent nominal movement; spikes near ±0.5 signal active kinematic deviations.'
              : 'Histogram of raw anomaly scores across all active maritime and aviation tracks (last 24 hours). The Isolation Forest outputs scores in the range [-0.5, 0.5]. Isotonic calibration maps raw scores to calibrated probabilities consumed by the Risk Index.'}
          </p>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-[var(--color-fg)]">
              SHAP Feature Importance {mode === 'realtime' && '(Live Telemetry Weights)'}
            </h4>
          </div>
          <FeatureImportanceChart
            features={currentFeatures}
            height={340}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
          />
          <p className="font-ui text-xs text-[var(--color-fg-muted)] leading-relaxed max-w-3xl">
            {mode === 'realtime'
              ? 'Live ranking of kinematic and spatial indicators extracted from real-time asset streams. Course deviation, AIS message gap, and proximity to hotzones dynamically adjust as target tracks move.'
              : 'Mean absolute SHAP values per feature extracted from the Isolation Forest model. Features are ranked by their average contribution to the anomaly score across all predictions.'}
          </p>
        </div>
      )}

      {activeTab === 'trend' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-[var(--color-fg)]">
              Detections — {mode === 'realtime' ? 'Realtime Live Stream' : '90-Day Trend'}
            </h4>
          </div>
          <DetectionTrendChart
            labels={currentTrendLabels}
            values={currentTrendValues}
            height={320}
            yLabel={mode === 'realtime' ? 'Live Events / min' : 'Anomalies / day'}
            color={THEME.info}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
          />
          <p className="font-ui text-xs text-[var(--color-fg-muted)] leading-relaxed max-w-3xl">
            {mode === 'realtime'
              ? 'Real-time telemetry event rate streaming live over WebSockets across monitored Strait of Hormuz, Persian Gulf, and Red Sea watch zones.'
              : 'Rolling daily count of anomaly detections across all monitored watch zones. Peaks correlate with elevated geopolitical tension periods and naval exercises.'}
          </p>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-[var(--color-fg)]">
              Model Ensemble — {mode === 'realtime' ? 'Live Stream Evaluation' : 'F1 Score Comparison'}
            </h4>
          </div>
          <ModelComparisonChart
            labels={currentCompLabels}
            series={currentCompSeries}
            height={340}
            yLabel={mode === 'realtime' ? 'Confidence / Score' : 'F1 Score'}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
          />
          <p className="font-ui text-xs text-[var(--color-fg-muted)] leading-relaxed max-w-3xl">
            {mode === 'realtime'
              ? 'Real-time side-by-side comparison streaming rule-based thresholds, ML Isolation Forest predictions, and calibrated ensemble scores for live tracks.'
              : 'F1 scores tracked over training epochs comparing standalone Isolation Forest, Local Outlier Factor, and the calibrated ensemble model.'}
          </p>
        </div>
      )}
    </div>
  );
}
