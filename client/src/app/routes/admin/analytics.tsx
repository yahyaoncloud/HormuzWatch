import {
  TrendingUp,
  Ship,
  Plane,
  Anchor,
  Gauge,
  AlertTriangle,
  Radio,
  Layers,
} from "lucide-react";
import { PageTodoList, type TodoItem } from "@/components/ui/PageTodoList";
import { useRealtimeStore } from "@/stores";
import { cn } from "@/utils/cn";

const ANALYTICS_TODOS: TodoItem[] = [
  { id: "y1", title: "Regional Threat Density & Category Charts", category: "UI & UX", completed: true, notes: "Visual progress bar density & category article distribution" },
  { id: "y2", title: "Automated PDF Executive Briefing Generator", category: "API & Data", completed: false, notes: "Connect jsPDF / html2canvas to generate downloadable PDF summaries" },
  { id: "y3", title: "OSINT Source Reliability Scatter Matrix", category: "ML & Anomaly", completed: false, notes: "Scatter plot comparing scrape volume against HTTP error rate per feed" },
  { id: "y4", title: "Choropleth Threat Heatmap Integration", category: "UI & UX", completed: false, notes: "Shaded country map visualization reflecting real-time threat scores" },
];

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export default function AdminAnalytics() {
  // Single source of truth: Zustand realtime store (fed by WebSocket)
  const stats = useRealtimeStore((s) => s.stats);
  const wsStatus = useRealtimeStore((s) => s.wsStatus);
  const connected = wsStatus === 'connected';
  const isLoading = !stats;

  // ── Derived values ──────────────────────────────────────────────────────
  const totalTracks = stats?.totalTracks ?? 0;
  const anomalyPct = totalTracks > 0 ? ((stats?.totalAnomalies ?? 0) / totalTracks) * 100 : 0;
  const maritimePct = totalTracks > 0 ? ((stats?.maritimeCount ?? 0) / totalTracks) * 100 : 0;
  const aviationPct = totalTracks > 0 ? ((stats?.aviationCount ?? 0) / totalTracks) * 100 : 0;

  // Vessel state percentages
  const anchoredPct = totalTracks > 0 ? ((stats?.anchoredCount ?? 0) / totalTracks) * 100 : 0;
  const slowPct = totalTracks > 0 ? ((stats?.slowCount ?? 0) / totalTracks) * 100 : 0;
  const maneuveringPct = totalTracks > 0 ? ((stats?.maneuveringCount ?? 0) / totalTracks) * 100 : 0;
  const transitingPct = totalTracks > 0 ? ((stats?.transitingCount ?? 0) / totalTracks) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Analytics & Strategic Reports</h1>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Live pipeline telemetry — computed in-memory from active track state. Pushed via WebSocket every 1s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1.5",
            connected
              ? "bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border-[var(--color-primary-600)]/30"
              : "bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              connected ? "bg-[var(--color-primary-600)]" : "bg-[var(--color-warning)]"
            )} />
            {connected ? "LIVE WS" : wsStatus === 'connecting' ? "CONNECTING" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      {/* KPI Stats — Live via WebSocket → Zustand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg EWMA Deviation */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>Avg EWMA Deviation</span>
            <TrendingUp className={cn(
              "h-4 w-4",
              (stats?.avgEWMA ?? 0) > 2 ? "text-red-500" : (stats?.avgEWMA ?? 0) > 1 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"
            )} />
          </div>
          {isLoading ? (
            <div className="h-8 bg-[var(--color-bg)]/60 rounded animate-pulse" />
          ) : (
            <>
              <p className={cn(
                "font-display text-2xl font-bold",
                (stats?.avgEWMA ?? 0) > 2 ? "text-red-500" : (stats?.avgEWMA ?? 0) > 1 ? "text-[var(--color-warning)]" : "text-[var(--color-fg)]"
              )}>
                {(stats?.avgEWMA ?? 0).toFixed(2)}
              </p>
              <p className="text-[11px] font-mono text-[var(--color-fg-muted)]">
                {stats?.highAnomalyCount ?? 0} high-anomaly vectors
              </p>
            </>
          )}
        </div>

        {/* Active Tracks */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>Active Tracks</span>
            <Radio className="h-4 w-4 text-[var(--color-primary-600)]" />
          </div>
          {isLoading ? (
            <div className="h-8 bg-[var(--color-bg)]/60 rounded animate-pulse" />
          ) : (
            <>
              <p className="font-display text-2xl font-bold text-[var(--color-fg)]">{formatNumber(totalTracks)}</p>
              <p className="text-[11px] font-mono text-[var(--color-fg-muted)]">
                {stats?.maritimeCount ?? 0} maritime · {stats?.aviationCount ?? 0} aviation
              </p>
            </>
          )}
        </div>

        {/* Anomalies Flagged */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>Anomalies Detected</span>
            <AlertTriangle className={cn(
              "h-4 w-4",
              (stats?.totalAnomalies ?? 0) > 10 ? "text-red-500" : "text-[var(--color-warning)]"
            )} />
          </div>
          {isLoading ? (
            <div className="h-8 bg-[var(--color-bg)]/60 rounded animate-pulse" />
          ) : (
            <>
              <p className={cn(
                "font-display text-2xl font-bold",
                (stats?.totalAnomalies ?? 0) > 10 ? "text-red-500" : "text-[var(--color-fg)]"
              )}>
                {stats?.totalAnomalies ?? 0} Flagged
              </p>
              <p className="text-[11px] font-mono text-[var(--color-fg-muted)]">{formatPct(anomalyPct)} of all tracks</p>
            </>
          )}
        </div>

        {/* Queue Pipeline Health */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>Pipeline Queue</span>
            <Layers className={cn(
              "h-4 w-4",
              (stats?.queueDropped ?? 0) > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"
            )} />
          </div>
          {isLoading ? (
            <div className="h-8 bg-[var(--color-bg)]/60 rounded animate-pulse" />
          ) : (
            <>
              <p className="font-display text-2xl font-bold text-[var(--color-fg)]">
                {formatNumber(stats?.queueProcessed ?? 0)}
              </p>
              <p className="text-[11px] font-mono text-[var(--color-fg-muted)]">
                {stats?.queueDropped ?? 0} drops · depth {stats?.queueDepth ?? 0}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vessel State Distribution */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Vessel State Distribution</h3>
            <span className="font-mono text-xs text-[var(--color-fg-muted)]">SPEED-BASED</span>
          </div>
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-[var(--color-bg)]/60 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {[
                { label: "Anchored (<0.5 kn)", count: stats?.anchoredCount ?? 0, pct: anchoredPct, color: "bg-slate-500", icon: Anchor },
                { label: "Slow (0.5–3 kn)", count: stats?.slowCount ?? 0, pct: slowPct, color: "bg-amber-500", icon: Gauge },
                { label: "Maneuvering (3–8 kn)", count: stats?.maneuveringCount ?? 0, pct: maneuveringPct, color: "bg-blue-500", icon: Ship },
                { label: "Transiting (>8 kn)", count: stats?.transitingCount ?? 0, pct: transitingPct, color: "bg-emerald-500", icon: Ship },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-ui">
                    <span className="text-[var(--color-fg)] font-semibold flex items-center gap-1.5">
                      <item.icon className="h-3 w-3 text-[var(--color-fg-muted)]" />
                      {item.label}
                    </span>
                    <span className="font-mono text-[var(--color-fg-muted)]">
                      {item.count} · {formatPct(item.pct)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-bg)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div
                      className={`${item.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(item.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Track Type Breakdown */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Track Type Breakdown</h3>
            <span className="font-mono text-xs text-[var(--color-fg-muted)]">TOTAL: {totalTracks}</span>
          </div>
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-[var(--color-bg)]/60 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {[
                {
                  label: "Maritime Vessels",
                  count: stats?.maritimeCount ?? 0,
                  pct: formatPct(maritimePct),
                  icon: Ship,
                  color: "text-sky-400",
                  borderColor: "border-sky-500/30",
                  bg: "bg-sky-500/10",
                },
                {
                  label: "Aviation / ADS-B",
                  count: stats?.aviationCount ?? 0,
                  pct: formatPct(aviationPct),
                  icon: Plane,
                  color: "text-indigo-400",
                  borderColor: "border-indigo-500/30",
                  bg: "bg-indigo-500/10",
                },
                {
                  label: "High Anomaly Vectors",
                  count: stats?.highAnomalyCount ?? 0,
                  pct: totalTracks > 0 ? formatPct(((stats?.highAnomalyCount ?? 0) / totalTracks) * 100) : "0.0%",
                  icon: AlertTriangle,
                  color: "text-red-400",
                  borderColor: "border-red-500/30",
                  bg: "bg-red-500/10",
                },
                {
                  label: "Avg Speed (kn)",
                  count: Math.round(stats?.avgSpeed ?? 0),
                  pct: `${(stats?.avgSpeed ?? 0).toFixed(1)} kn`,
                  icon: Gauge,
                  color: "text-emerald-400",
                  borderColor: "border-emerald-500/30",
                  bg: "bg-emerald-500/10",
                },
              ].map((cat) => (
                <div
                  key={cat.label}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border bg-[var(--color-bg)]/40 text-xs font-ui",
                    cat.borderColor,
                    cat.bg,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <cat.icon className={cn("h-4 w-4", cat.color)} />
                    <span className="font-semibold text-[var(--color-fg)]">{cat.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={cn("font-mono font-bold", cat.color)}>{cat.pct}</span>
                    <span className="text-[10px] font-mono text-[var(--color-fg-muted)] block">
                      {cat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      {stats?.updatedAt && (
        <div className="text-center text-[10px] font-mono text-[var(--color-fg-muted)]">
          Last push: {new Date(stats.updatedAt).toLocaleTimeString()} · WebSocket → Zustand · Every 1s
        </div>
      )}

      {/* TODO List Component */}
      <PageTodoList pageTitle="Analytics & Strategic Reports" items={ANALYTICS_TODOS} />
    </div>
  );
}
