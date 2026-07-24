import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Cpu,
  Database,
  Loader2,
  ShieldAlert,
  Ship,
  Users,
  Waves,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Section } from '@/components/layout/Section';
import {
  approveUser,
  blacklistUser,
  getBlockadeIndicators,
  getDataQuality,
  getPendingUsers,
  getPublicMetrics,
  getTransits,
  getUsers,
  getVesselStates,
  type BlockadeIndicators,
  type PendingUser,
  type SiteUser,
} from '@/lib/api';
import { cn } from '@/utils/cn';

export default function AdminDashboard() {
  // ── Live data ────────────────────────────────────────────────────────────
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: getPublicMetrics,
    refetchInterval: 30000,
  });

  const { data: users } = useQuery<SiteUser[]>({
    queryKey: ['admin-users'],
    queryFn: getUsers,
    refetchInterval: 30000,
  });

  const { data: pendingUsers, refetch: refetchPending } = useQuery<PendingUser[]>({
    queryKey: ['admin-pending'],
    queryFn: getPendingUsers,
    refetchInterval: 15000,
  });

  const { data: blockade } = useQuery<BlockadeIndicators>({
    queryKey: ['admin-blockade'],
    queryFn: getBlockadeIndicators,
    refetchInterval: 60000,
  });

  const { data: transits } = useQuery({
    queryKey: ['admin-transits'],
    queryFn: () => getTransits(24),
    refetchInterval: 60000,
  });

  const { data: vesselStates } = useQuery({
    queryKey: ['admin-vessel-states'],
    queryFn: getVesselStates,
    refetchInterval: 30000,
  });

  const { data: dataQuality } = useQuery({
    queryKey: ['admin-data-quality'],
    queryFn: getDataQuality,
    refetchInterval: 120000,
  });

  const m = metrics?.metrics;

  // ── User management actions ──────────────────────────────────────────────
  const [actioningUser, setActioningUser] = useState<string | null>(null);

  const handleApprove = async (username: string) => {
    setActioningUser(username);
    try {
      await approveUser(username);
      refetchPending();
    } catch (e) {
      console.error('Failed to approve:', e);
    } finally {
      setActioningUser(null);
    }
  };

  const handleReject = async (username: string) => {
    setActioningUser(username);
    try {
      await blacklistUser(username);
      refetchPending();
    } catch (e) {
      console.error('Failed to reject:', e);
    } finally {
      setActioningUser(null);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalUsers = users?.length ?? 0;
  const activeUsers = users?.filter((u) => u.status === 'approved').length ?? 0;
  const pendingCount = pendingUsers?.length ?? 0;
  const straitStatus = blockade?.strait_status;
  const transitCount = transits?.inbound ?? 0;
  const cleanPct = dataQuality?.clean_percentage ?? 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/90 p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] animate-pulse" />
                SECURE ROOT ADMIN CONSOLE
              </span>
              {straitStatus && (
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1.5',
                    straitStatus === 'ACTIVE' && 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                    straitStatus === 'LIMITED' && 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                    straitStatus === 'NO_TRANSIT' && 'bg-red-500/15 text-red-500 border-red-500/30'
                  )}
                >
                  <ShieldAlert className="h-3 w-3" />
                  STRAIT: {straitStatus === 'NO_TRANSIT' ? 'NO TRANSIT' : straitStatus}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-fg)] mt-2">
              Admin System Control Panel
            </h1>
            <p className="font-ui text-xs sm:text-sm text-[var(--color-fg-muted)] mt-1 max-w-xl">
              Live platform metrics, user management, transit monitoring, and ML pipeline status.
            </p>
          </div>
          <div className="text-right text-[11px] font-mono text-[var(--color-fg-muted)]">
            Auto-refresh: 15–120s intervals
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-md p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">Users</span>
            <Users className="h-4 w-4 text-[var(--color-primary-600)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-fg)] mt-2">{totalUsers}</div>
          <span className="font-ui text-[11px] text-[var(--color-success)] mt-1 inline-block">
            {activeUsers} active · {pendingCount} pending
          </span>
        </div>

        <div className="glass-card rounded-md p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">Vessels Tracked</span>
            <Ship className="h-4 w-4 text-[var(--color-success)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-fg)] mt-2">
            {m?.maritimeCount ?? vesselStates?.total ?? '—'}
          </div>
          <span className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-1 inline-block">
            {vesselStates ? `${vesselStates.states?.transiting ?? 0} transiting · ${vesselStates.states?.anchored ?? 0} anchored` : 'Loading...'}
          </span>
        </div>

        <div className="glass-card rounded-md p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">Strait Transits</span>
            <Waves className="h-4 w-4 text-[var(--color-primary-600)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-fg)] mt-2">
            {transits !== undefined ? (
              <span className={cn(
                straitStatus === 'NO_TRANSIT' && 'text-[var(--color-danger)]',
                straitStatus === 'LIMITED' && 'text-amber-500',
                straitStatus === 'ACTIVE' && 'text-[var(--color-success)]'
              )}>
                {transitCount}
              </span>
            ) : '—'}
          </div>
          <span className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-1 inline-block">24h Inbound</span>
        </div>

        <div className="glass-card rounded-md p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">AIS Quality</span>
            <Database className="h-4 w-4 text-[var(--color-success)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-success)] mt-2">
            {dataQuality ? `${cleanPct.toFixed(1)}%` : '—'}
          </div>
          <span className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-1 inline-block">
            {dataQuality ? `${dataQuality.total_positions?.toLocaleString() ?? 0} positions` : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Approval Queue */}
        <Section title="User Approval Queue" subtitle={`${pendingCount} pending registration${pendingCount !== 1 ? 's' : ''}`}>
          <div className="glass-card rounded-md p-4 border border-[var(--color-border)] space-y-3">
            {pendingUsers && pendingUsers.length > 0 ? (
              pendingUsers.map((req) => (
                <div
                  key={req.username}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--color-fg)]">{req.username}</div>
                    <div className="font-mono text-[11px] text-[var(--color-fg-muted)]">{req.email}</div>
                    <div className="text-[10px] text-[var(--color-fg-muted)] mt-0.5">
                      {req.createdAt ? new Date(req.createdAt).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(req.username)}
                      disabled={actioningUser === req.username}
                      className="p-1.5 bg-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Approve User"
                    >
                      {actioningUser === req.username ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(req.username)}
                      disabled={actioningUser === req.username}
                      className="p-1.5 bg-[var(--color-danger)]/20 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Reject / Blacklist User"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-[var(--color-fg-muted)] text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[var(--color-success)]" />
                No pending user approvals
              </div>
            )}
          </div>
        </Section>

        {/* Blockade & Situation Status */}
        <Section title="Blockade & Transit Status" subtitle={blockade?.situation?.title ?? 'Monitoring maritime activity'}>
          <div className="glass-card rounded-md p-4 border border-[var(--color-border)] space-y-3 text-xs">
            {/* Situation assessment */}
            {blockade?.situation && (
              <div className={cn(
                'p-3 rounded-lg border text-xs',
                blockade.situation.level === 'normal' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
                blockade.situation.level === 'elevated' && 'bg-amber-500/10 border-amber-500/20 text-amber-500',
                blockade.situation.level === 'critical' && 'bg-red-500/10 border-red-500/20 text-red-500',
                blockade.situation.level === 'high' && 'bg-orange-500/10 border-orange-500/20 text-orange-500'
              )}>
                <div className="font-semibold">{blockade.situation.title}</div>
                <div className="mt-1 text-[11px] opacity-80">{blockade.situation.text}</div>
              </div>
            )}

            {/* Key indicators */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40">
                <div className="text-[10px] text-[var(--color-fg-muted)] uppercase">Anchored</div>
                <div className="font-mono text-sm font-bold text-[var(--color-fg)]">
                  {blockade?.anchored_vessels ?? '—'}
                  <span className="text-[11px] font-normal text-[var(--color-fg-muted)] ml-1">
                    ({blockade?.anchored_ratio_pct?.toFixed(1) ?? 0}%)
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40">
                <div className="text-[10px] text-[var(--color-fg-muted)] uppercase">Waiting 6h+</div>
                <div className="font-mono text-sm font-bold text-[var(--color-fg)]">
                  {blockade?.waiting_fleet_6h ?? '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40">
                <div className="text-[10px] text-[var(--color-fg-muted)] uppercase">Waiting 24h+</div>
                <div className="font-mono text-sm font-bold text-[var(--color-fg)]">
                  {blockade?.waiting_fleet_24h ?? '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40">
                <div className="text-[10px] text-[var(--color-fg-muted)] uppercase">Strait 24h</div>
                <div className="font-mono text-sm font-bold text-[var(--color-fg)]">
                  {blockade?.strait_transits_24h ?? '—'}
                </div>
              </div>
            </div>

            {/* Recent transit events */}
            {transits?.recent_events && transits.recent_events.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-[var(--color-fg-muted)] uppercase">
                  Recent Transits
                </div>
                {transits.recent_events.slice(0, 4).map((evt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[11px]"
                  >
                    <Ship className="h-3 w-3 text-[var(--color-primary-600)] shrink-0" />
                    <span className="font-mono text-[var(--color-fg)]">
                      {evt.ship_name || `MMSI ${evt.mmsi}`}
                    </span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-bold',
                        evt.direction === 'INBOUND' && 'bg-emerald-500/20 text-emerald-500',
                        evt.direction === 'OUTBOUND' && 'bg-blue-500/20 text-blue-500'
                      )}
                    >
                      {evt.direction}
                    </span>
                    <span className="text-[var(--color-fg-muted)] ml-auto">
                      {evt.gate} · {evt.speed}kn
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Pipeline Health */}
      <Section title="Pipeline Status" subtitle="Ingestion, ML, and data quality metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="glass-card rounded-lg p-3 border border-[var(--color-border)] text-center">
            <div className="text-[10px] text-[var(--color-fg-muted)] uppercase mb-1">AIS Stream</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-emerald-500">ONLINE</span>
            </div>
          </div>
          <div className="glass-card rounded-lg p-3 border border-[var(--color-border)] text-center">
            <div className="text-[10px] text-[var(--color-fg-muted)] uppercase mb-1">ADS-B Air</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-sky-500">ONLINE</span>
            </div>
          </div>
          <div className="glass-card rounded-lg p-3 border border-[var(--color-border)] text-center">
            <div className="text-[10px] text-[var(--color-fg-muted)] uppercase mb-1">News Pipeline</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-indigo-500">ACTIVE</span>
            </div>
          </div>
          <div className="glass-card rounded-lg p-3 border border-[var(--color-border)] text-center">
            <div className="text-[10px] text-[var(--color-fg-muted)] uppercase mb-1">ML Engine</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-amber-500">
                {m?.totalTracks ?? 0} TRACKS
              </span>
            </div>
          </div>
          <div className="glass-card rounded-lg p-3 border border-[var(--color-border)] text-center">
            <div className="text-[10px] text-[var(--color-fg-muted)] uppercase mb-1">Queue Drops</div>
            <div className="flex items-center justify-center gap-1.5">
              <Cpu className="h-3 w-3 text-[var(--color-fg-muted)]" />
              <span
                className={cn(
                  'font-mono text-xs font-bold',
                  (m?.queueDropped ?? 0) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
                )}
              >
                {m?.queueDropped ?? 0}
              </span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
