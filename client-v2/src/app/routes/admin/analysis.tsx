import { useQuery, useMutation } from "@tanstack/react-query";
import { env } from "@/environments/environment";
import { useState } from "react";
import {
  BarChart3,
  PieChart,
  Activity,
  Zap,
  RefreshCw,
  Play,
  FileSearch,
  Calendar,
  Gauge,
  AlertTriangle,
  Ship,
  Plane,
  Layers,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface DatasetInfo {
  name: string;
  size: number;
  modified: string;
  format: string;
}

interface ChartInfo {
  name: string;
  size: number;
  created: string;
}

interface AnalysisResult {
  dataset: string;
  analyzed_at: string;
  charts: Array<{ name: string; title: string }>;
  insights: Record<string, unknown>;
}

// ── API Helpers ────────────────────────────────────────────────────────────

const ANALYSIS_BASE = env.mlServiceUrl || "http://localhost:8090";

async function fetchAnalysis<T>(path: string): Promise<T> {
  const res = await fetch(`${ANALYSIS_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Analysis API error: ${res.status}`);
  }
  return res.json();
}

async function triggerAnalysis(dataset?: string): Promise<AnalysisResult> {
  const params = dataset ? `?dataset=${encodeURIComponent(dataset)}` : "";
  const res = await fetch(`${ANALYSIS_BASE}/api/analysis/run${params}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

function chartUrl(name: string): string {
  return `${ANALYSIS_BASE}/api/analysis/chart/${encodeURIComponent(name)}`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`;
}

function formatAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminAnalysis() {
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Fetch available datasets
  const {
    data: datasetsData,
    isLoading: dsLoading,
    error: dsError,
  } = useQuery({
    queryKey: ["analysis", "datasets"],
    queryFn: () => fetchAnalysis<{ datasets: DatasetInfo[]; count: number }>("/api/analysis/datasets"),
    refetchInterval: 30000,
  });

  // Fetch available charts
  const {
    data: chartsData,
    isLoading: chartsLoading,
    error: chartsError,
  } = useQuery({
    queryKey: ["analysis", "charts"],
    queryFn: () => fetchAnalysis<{ charts: ChartInfo[]; count: number }>("/api/analysis/charts"),
    refetchInterval: 30000,
  });

  // Trigger analysis mutation
  const runMutation = useMutation({
    mutationFn: (dataset?: string) => triggerAnalysis(dataset),
    onSuccess: (result) => {
      setAnalysisResult(result);
      // Refresh chart list
    },
  });

  const datasets = datasetsData?.datasets ?? [];
  const charts = chartsData?.charts ?? [];

  const handleRunAnalysis = () => {
    runMutation.mutate(selectedDataset || undefined);
  };

  const isLoading = dsLoading || chartsLoading;
  const hasError = dsError || chartsError;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-ui pb-12">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[var(--color-primary-600)]" />
          <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Dataset Analysis</h1>
        </div>
        <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
          Analyze exported datasets to generate intelligence charts. Requires the Python analysis engine (ml-service).
          Exported datasets from the Dataset Pipeline are automatically detected.
        </p>
      </div>

      {/* Analysis Control Panel */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <Play className="h-4 w-4 text-[var(--color-primary-600)]" />
          <h2 className="font-display text-sm font-bold text-[var(--color-fg)]">Run Analysis</h2>
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] tracking-wider block mb-1.5">
              Dataset
            </label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
            >
              <option value="">Latest available dataset</option>
              {datasets.map((ds) => (
                <option key={ds.name} value={ds.name}>
                  {ds.name} ({formatSize(ds.size)})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={runMutation.isPending}
            className="px-4 py-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center gap-2 transition-colors"
          >
            {runMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Results Feedback */}
        {runMutation.isError && (
          <div className="p-3 rounded-md bg-red-500/15 border border-red-500/30 text-xs text-red-400 font-mono">
            Analysis failed: {runMutation.error instanceof Error ? runMutation.error.message : "Unknown error"}
          </div>
        )}
        {analysisResult && runMutation.isSuccess && (
          <div className="p-3 rounded-md bg-[var(--color-success)]/15 border border-[var(--color-success)]/30 text-xs text-[var(--color-success)] font-mono">
            Analysis complete: {analysisResult.dataset} &mdash; {analysisResult.charts.length} chart
            {analysisResult.charts.length !== 1 ? "s" : ""} generated
          </div>
        )}
      </div>

      {/* Insights Summary */}
      {analysisResult?.insights && Object.keys(analysisResult.insights).length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3 mb-4">
            <FileSearch className="h-4 w-4 text-[var(--color-primary-600)]" />
            <h2 className="font-display text-sm font-bold text-[var(--color-fg)]">Key Insights</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {analysisResult.insights.total_observations != null && (
              <InsightCard
                icon={<Layers className="h-4 w-4 text-[var(--color-primary-600)]" />}
                label="Total Observations"
                value={String(analysisResult.insights.total_observations)}
              />
            )}
            {analysisResult.insights.active_tracks != null && (
              <InsightCard
                icon={<Ship className="h-4 w-4 text-sky-400" />}
                label="Active Tracks"
                value={String(analysisResult.insights.active_tracks)}
              />
            )}
            {analysisResult.insights.total_anomalies != null && (
              <InsightCard
                icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                label="Total Anomalies"
                value={String(analysisResult.insights.total_anomalies)}
              />
            )}
            {analysisResult.insights.total_transits != null && (
              <InsightCard
                icon={<Plane className="h-4 w-4 text-emerald-400" />}
                label="Total Transits"
                value={String(analysisResult.insights.total_transits)}
              />
            )}
            {analysisResult.insights.avg_anomaly_score != null && (
              <InsightCard
                icon={<Gauge className="h-4 w-4 text-amber-400" />}
                label="Avg Anomaly Score"
                value={String(analysisResult.insights.avg_anomaly_score)}
              />
            )}
            {analysisResult.insights.avg_speed != null && (
              <InsightCard
                icon={<Activity className="h-4 w-4 text-[var(--color-primary-600)]" />}
                label="Avg Speed"
                value={`${analysisResult.insights.avg_speed} kn`}
              />
            )}
            {analysisResult.insights.total_events != null && (
              <InsightCard
                icon={<Calendar className="h-4 w-4 text-purple-400" />}
                label="Total Events"
                value={String(analysisResult.insights.total_events)}
              />
            )}
            {analysisResult.insights.total_articles != null && (
              <InsightCard
                icon={<FileSearch className="h-4 w-4 text-[var(--color-primary-600)]" />}
                label="Total Articles"
                value={String(analysisResult.insights.total_articles)}
              />
            )}
          </div>
        </div>
      )}

      {/* Charts Gallery */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <PieChart className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <h2 className="font-display text-sm font-bold text-[var(--color-fg)]">
            Generated Charts ({charts.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-fg-muted)]" />
            <span className="ml-3 text-sm text-[var(--color-fg-muted)]">Loading charts...</span>
          </div>
        ) : hasError ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 opacity-60" />
            <p className="text-sm text-amber-400 font-semibold">
              Analysis engine unavailable
            </p>
            <p className="text-xs text-[var(--color-fg-muted)] max-w-md mx-auto">
              The Python analysis service (ml-service) is not running or unreachable at{" "}
              <code className="font-mono text-[var(--color-primary-600)]">{ANALYSIS_BASE}</code>.
              Start the service to generate and view analysis charts.
            </p>
          </div>
        ) : charts.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-fg-muted)] space-y-3">
            <BarChart3 className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm">No analysis charts generated yet</p>
            <p className="text-xs max-w-md mx-auto">
              Export a dataset from the Dataset Pipeline page, then click "Run Analysis" to generate
              charts from your data.
            </p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {charts.map((chart) => (
              <div
                key={chart.name}
                className="rounded-md border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-elevated)]"
              >
                <img
                  src={chartUrl(chart.name)}
                  alt={chart.name}
                  className="w-full h-auto"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-border)]">
                  <span className="font-mono text-[10px] text-[var(--color-fg-muted)] truncate">
                    {chart.name}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-fg-muted)]">
                    <span>{formatSize(chart.size)}</span>
                    <span className="text-[var(--color-border)]">|</span>
                    <span>{formatAge(chart.created)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Insight Card ───────────────────────────────────────────────────────────

function InsightCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)]">{label}</span>
      </div>
      <div className="font-mono text-lg font-bold text-[var(--color-fg)]">{value}</div>
    </div>
  );
}
