import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Anchor,
  Loader2,
  Newspaper,
  Rss,
  Satellite,
  Shield,
  Ship,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/providers';
import {
  getBlockadeIndicators,
  getDataQuality,
  getLatestNews,
  getPublicMetrics,
  getSources,
  getTopTraces,
  getTransits,
  getVesselStates,
  type BlockadeIndicators,
  type TransitSummary,
  type VesselStateCounts,
} from '@/lib/api';
import { cn } from '@/utils/cn';
import { useNotificationStore, useUIStore, useRealtimeStore } from '@/stores';

// ── Realtime Line Chart (WebSocket-driven) ──────────────────────────────────
interface DataPoint { t: number; v: number; label: string; }

function RealtimeChart({ data, color = '#6366f1', height = 180, label = '' }: {
  data: DataPoint[]; color?: string; height?: number; label?: string;
}) {
  const maxPts = 120;
  const display = data.slice(-maxPts);
  const max = Math.max(...display.map(d => d.v), 1) * 1.1;
  const min = 0;
  const w = 600;
  const h = height;
  const pad = { t: 12, r: 8, b: 24, l: 40 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;

  const points = display.map((d, i) => {
    const x = pad.l + (i / Math.max(display.length - 1, 1)) * pw;
    const y = pad.t + (1 - (d.v - min) / (max - min || 1)) * ph;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map(p => {
        const y = pad.t + (1 - p) * ph;
        return (
          <g key={p}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={pad.l - 4} y={y + 3} textAnchor="end" className="fill-[var(--color-fg-muted)] text-[8px]" fontFamily="monospace">{Math.round(max * p)}</text>
          </g>
        );
      })}
      {label && <text x={w / 2} y={h - 2} textAnchor="middle" className="fill-[var(--color-fg-muted)] text-[9px]" fontFamily="system-ui">{label}</text>}
      {display.length > 1 && (
        <polygon points={`${pad.l},${pad.t + ph} ${points.join(' ')} ${w - pad.r},${pad.t + ph}`} fill={color} fillOpacity="0.08" />
      )}
      {display.length > 1 && (
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {display.length > 0 && (
        <>
          <circle cx={points[points.length - 1]?.split(',')[0]} cy={points[points.length - 1]?.split(',')[1]} r="3" fill={color} />
          <circle cx={points[points.length - 1]?.split(',')[0]} cy={points[points.length - 1]?.split(',')[1]} r="6" fill={color} fillOpacity="0.15" />
        </>
      )}
    </svg>
  );
}

// ── Mini KPI Card ───────────────────────────────────────────────────────────
function MiniKPI({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub: string }) {
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 rounded-none shadow-[0_0_6px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
        <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className="font-mono text-base font-bold text-[var(--color-fg)]">{value}</div>
      <div className="text-[10px] text-[var(--color-fg-muted)] mt-0.5">{sub}</div>
    </div>
  );
}

// ── Intelligence Dashboard ──────────────────────────────────────────────────
export function IntelligenceDashboard() {
  const { data: metrics } = useQuery({ queryKey: ['intel-metrics'], queryFn: getPublicMetrics, refetchInterval: false, staleTime: Infinity });
  const { data: blockade } = useQuery<BlockadeIndicators>({ queryKey: ['intel-blockade'], queryFn: getBlockadeIndicators, refetchInterval: 30000 });
  const { data: transits } = useQuery<TransitSummary>({ queryKey: ['intel-transits'], queryFn: () => getTransits(24), refetchInterval: 30000 });
  const { data: states } = useQuery<VesselStateCounts>({ queryKey: ['intel-states'], queryFn: getVesselStates, refetchInterval: 15000 });
  const { data: dq } = useQuery({ queryKey: ['intel-dq'], queryFn: getDataQuality, refetchInterval: 60000 });
  const { data: traces } = useQuery({ queryKey: ['intel-traces'], queryFn: getTopTraces, refetchInterval: false, staleTime: Infinity });
  const { data: newsData } = useQuery({ queryKey: ['intel-news'], queryFn: () => getLatestNews(), refetchInterval: 60000 });
  const { data: sourcesData } = useQuery({ queryKey: ['intel-sources'], queryFn: () => getSources(), refetchInterval: 120000 });

  const addNotification = useNotificationStore(s => s.addNotification);
  const addToast = useUIStore(s => s.addToast);

  const ws = useWebSocket();
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const chartMax = 180;

  const liveStats = useRealtimeStore((s) => s.stats);
  useEffect(() => {
    if (ws?.telemetry) {
      setChartData(prev => {
        const now = Date.now();
        const next = [...prev, { t: now, v: ws.telemetry?.speed ?? metrics?.metrics?.avgScore ?? 0, label: 'Vessel Activity' }];
        return next.slice(-chartMax);
      });
    }
  }, [ws?.telemetry]);

  const lastAlertRef = useRef<string | null>(null);
  useEffect(() => {
    const criticals = (traces?.traces ?? []).filter((t: any) => t.severity === 'critical');
    const latest = criticals[0];
    if (latest && latest.trackId !== lastAlertRef.current) {
      lastAlertRef.current = latest.trackId;
      addNotification({ title: `Critical Alert: ${latest.assetName || latest.trackId}`, body: `Score ${latest.score?.toFixed(1) ?? '—'}/100 detected in region.`, type: 'critical' });
      addToast({ type: 'error', title: 'Critical Alert', message: `${latest.assetName || latest.trackId} — Score ${latest.score?.toFixed(1) ?? '—'}/100` });
    }
  }, [traces]);

  useEffect(() => {
    if (blockade && blockade.situation?.level === 'critical') {
      addNotification({ title: `Blockade Critical: ${blockade.situation.title}`, body: blockade.situation.text, type: 'critical' });
      addToast({ type: 'error', title: 'Blockade Critical', message: blockade.situation.title });
    }
  }, [blockade?.situation?.level]);

  const m = metrics?.metrics;
  const ss = blockade?.strait_status;
  const totalVessels = liveStats?.maritimeCount ?? m?.maritimeCount ?? states?.total ?? 0;
  const articles = ((newsData as any)?.articles || (newsData as any)?.data || []).slice(0, 15);
  const sources = (sourcesData as any)?.sources || (sourcesData as any)?.data || [];

  return (
    <div className="w-full max-w-[1650px] mx-auto px-3 py-2 h-[calc(100vh-3.2rem)] overflow-hidden grid grid-cols-1 lg:grid-cols-5 gap-3">
      {/* LEFT COLUMN: Realtime Chart + Metrics (3/5 width) */}
      <div className="lg:col-span-3 h-full flex flex-col gap-3 pr-2 overflow-hidden border-r border-[var(--color-border)]">
        {/* Realtime Line Chart */}
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none shadow-[0_0_10px_rgba(99,102,241,0.12)] shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-[var(--color-primary-600)]" />
              <span className="text-xs font-semibold text-[var(--color-fg)] tracking-wide uppercase">Live Vessel Activity</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse rounded-none" />
              <span className="text-[10px] text-[var(--color-fg-muted)]">WebSocket</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">{chartData.length} points</span>
          </div>
          {chartData.length > 0 ? (
            <RealtimeChart data={chartData} color="var(--color-primary-600)" height={160} label="Vessel Activity Index" />
          ) : (
            <div className="flex items-center justify-center h-[160px] text-xs text-[var(--color-fg-muted)]">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Waiting for telemetry data...
            </div>
          )}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <MiniKPI icon={Ship} label="Active Vessels" value={totalVessels} sub={`${liveStats?.transitingCount ?? states?.states?.transiting ?? 0} transiting`} />
          <MiniKPI icon={Anchor} label="Anchored" value={liveStats?.anchoredCount ?? blockade?.anchored_vessels ?? '—'} sub={`${blockade?.anchored_ratio_pct?.toFixed(0) ?? 0}%`} />
          <MiniKPI icon={Waves} label="24h Transits" value={(transits?.inbound ?? 0) + (transits?.outbound ?? 0)} sub={`${transits?.inbound ?? 0} IN · ${transits?.outbound ?? 0} OUT`} />
          <MiniKPI icon={AlertTriangle} label="Critical Alerts" value={liveStats?.highAnomalyCount ?? m?.criticalCount ?? 0} sub={`${liveStats?.totalAnomalies ?? m?.highCount ?? 0} anomalies`} />
        </div>

        {/* Vessel State + Anchorage Row */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Vessel State Distribution */}
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <Ship className="h-4 w-4 text-[var(--color-primary-600)]" />
              <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Vessel States</span>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {[
                { k: 'transiting', label: 'Transiting', icon: TrendingUp, color: 'bg-[var(--color-primary-600)]', wsVal: liveStats?.transitingCount },
                { k: 'maneuvering', label: 'Maneuvering', icon: TrendingUp, color: 'bg-blue-500', wsVal: liveStats?.maneuveringCount },
                { k: 'slow', label: 'Slow', icon: TrendingDown, color: 'bg-amber-500', wsVal: liveStats?.slowCount },
                { k: 'anchored', label: 'Anchored', icon: Anchor, color: 'bg-orange-500', wsVal: liveStats?.anchoredCount },
              ].map(s => {
                const cnt = s.wsVal ?? states?.states?.[s.k] ?? 0;
                const pct = totalVessels > 0 ? cnt / totalVessels * 100 : 0;
                return (
                  <div key={s.k} className="flex items-center gap-2 text-xs">
                    <s.icon className="h-3.5 w-3.5 text-[var(--color-fg-muted)] shrink-0" />
                    <span className="w-20 text-[var(--color-fg-muted)] truncate">{s.label}</span>
                    <div className="flex-1 h-2 bg-[var(--color-bg-elevated)] overflow-hidden rounded-none">
                      <div className={`h-full transition-all ${s.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono font-bold w-8 text-right text-[var(--color-fg)]">{cnt}</span>
                    <span className="text-[10px] text-[var(--color-fg-muted)] w-8 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anchorage Zones */}
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <Anchor className="h-4 w-4 text-[var(--color-primary-600)]" />
              <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Anchorage Zones</span>
            </div>
            <div className="grid grid-cols-1 gap-1 overflow-y-auto flex-1 pr-1">
              {Object.entries(states?.zone_counts ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([zone, cnt]) => (
                <div key={zone} className="flex items-center justify-between px-2 py-1 border border-[var(--color-border)] bg-[var(--color-bg)] text-[11px] rounded-none">
                  <span className="truncate text-[var(--color-fg)]">{zone}</span>
                  <span className="font-mono font-bold text-[var(--color-fg)] ml-1">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: News Feed + Sources + Flags (2/5 width) */}
      <div className="lg:col-span-2 h-full flex flex-col gap-3 pl-1 overflow-hidden">
        {/* Strait Status Card with Tactical Glow */}
        <div className={cn(
          "border p-3 rounded-none shrink-0 transition-all",
          ss === 'NO_TRANSIT' ? "border-red-500/50 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.3)]" : "border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[0_0_8px_rgba(0,0,0,0.2)]"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--color-primary-600)]" />
              <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Strait Status</span>
            </div>
            <span className={cn('px-2.5 py-0.5 text-[10px] font-bold border rounded-none',
              ss === 'ACTIVE' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_6px_rgba(16,185,129,0.2)]',
              ss === 'LIMITED' && 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_6px_rgba(245,158,11,0.2)]',
              ss === 'NO_TRANSIT' && 'bg-red-500/10 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
              !ss && 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] border-[var(--color-border)]'
            )}>{ss === 'NO_TRANSIT' ? 'NO TRANSIT' : ss || '---'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { l: 'Waiting 6h', v: blockade?.waiting_fleet_6h ?? 0, c: (blockade?.waiting_fleet_6h ?? 0) > 10 ? 'text-amber-400' : '' },
              { l: 'Waiting 24h', v: blockade?.waiting_fleet_24h ?? 0, c: (blockade?.waiting_fleet_24h ?? 0) > 20 ? 'text-red-400' : '' },
              { l: 'Active Fleet', v: blockade?.active_vessels ?? 0, c: '' },
            ].map(r => (
              <div key={r.l} className="p-1.5 border border-[var(--color-border)] bg-[var(--color-bg)] text-center rounded-none">
                <div className="text-[9px] text-[var(--color-fg-muted)] uppercase">{r.l}</div>
                <div className={cn('font-mono text-xs font-bold mt-0.5', r.c || 'text-[var(--color-fg)]')}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live News Feed - Fits inside non-scrollable layout */}
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 rounded-none flex-1 min-h-0 flex flex-col overflow-hidden shadow-[0_0_8px_rgba(99,102,241,0.1)]">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Newspaper className="h-4 w-4 text-[var(--color-primary-600)]" />
            <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Live News Feed</span>
            <span className="ml-auto text-[10px] font-mono text-[var(--color-fg-muted)]">{articles.length} articles</span>
          </div>
          <div className="space-y-0 overflow-y-auto flex-1 divide-y divide-[var(--color-border)] pr-1">
            {articles.map((a: any, i: number) => (
              <div key={a.id || i} className="py-2 first:pt-0 last:pb-0 hover:bg-[var(--color-bg-elevated)]/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold text-[var(--color-fg-muted)] uppercase">{a.source_name || a.source || 'Source'}</span>
                  <span className="w-1 h-1 bg-[var(--color-fg-muted)] rounded-none" />
                  <span className="text-[10px] text-[var(--color-fg-muted)]">{a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</span>
                </div>
                <div className="text-xs font-semibold text-[var(--color-fg)] leading-snug mb-0.5">{a.title}</div>
                <div className="text-[11px] text-[var(--color-fg-muted)] leading-relaxed line-clamp-2">{a.summary || a.content?.substring(0, 200) || ''}</div>
                <div className="flex items-center gap-2 mt-1">
                  {a.category && <span className="text-[9px] text-primary-700 dark:text-primary-300 bg-primary-500/10 px-1.5 py-0.5 border border-primary-500/20 rounded-none">{a.category}</span>}
                  {a.country && <span className="text-[10px] text-[var(--color-fg-muted)]">{a.country}</span>}
                  {a.risk_score != null && (
                    <span className={cn('text-[10px] font-bold ml-auto',
                      a.risk_score > 70 ? 'text-red-400' : a.risk_score > 40 ? 'text-amber-400' : 'text-emerald-400'
                    )}>Risk {a.risk_score.toFixed(0)}</span>
                  )}
                </div>
              </div>
            ))}
            {articles.length === 0 && (
              <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Loading news articles...
              </div>
            )}
          </div>
        </div>

        {/* Data Quality & Sources Row */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {/* Data Sources */}
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 rounded-none">
            <div className="flex items-center gap-2 mb-1">
              <Rss className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
              <span className="text-[10px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Sources</span>
            </div>
            <div className="space-y-0.5 max-h-20 overflow-y-auto">
              {(Array.isArray(sources) ? sources.slice(0, 4) : []).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-[var(--color-fg)] truncate">{s.name || s.source_name || ''}</span>
                  <span className="text-[9px] text-[var(--color-fg-muted)] shrink-0 ml-1">{s.language || s.type || ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AIS Data Quality */}
          <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 rounded-none">
            <div className="flex items-center gap-1.5 mb-1">
              <Satellite className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
              <span className="text-[10px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">AIS Quality</span>
              <span className="ml-auto font-mono text-xs font-bold text-[var(--color-fg)]">{dq?.clean_percentage?.toFixed(0) ?? '—'}%</span>
            </div>
            <div className="h-1.5 bg-[var(--color-bg-elevated)] overflow-hidden mb-1 rounded-none">
              <div className="h-full bg-[var(--color-primary-600)]" style={{ width: `${dq?.clean_percentage ?? 0}%` }} />
            </div>
            <div className="flex justify-between text-[9px] text-[var(--color-fg-muted)]">
              <span>{dq?.clean_positions?.toLocaleString() ?? 0} clean</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntelligenceDashboard;
