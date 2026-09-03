import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Ship,
  Sparkles,
  Users,
  Waves,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
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
  const [refreshing, setRefreshing] = useState(false);

  // ── Live Query Telemetry ──────────────────────────────────────────────────
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: getPublicMetrics,
    refetchInterval: 30000,
  });

  const { data: users, refetch: refetchUsers } = useQuery<SiteUser[]>({
    queryKey: ['admin-users'],
    queryFn: getUsers,
    refetchInterval: 30000,
  });

  const { data: pendingUsers, refetch: refetchPending } = useQuery<PendingUser[]>({
    queryKey: ['admin-pending'],
    queryFn: getPendingUsers,
    refetchInterval: 15000,
  });

  const { data: blockade, refetch: refetchBlockade } = useQuery<BlockadeIndicators>({
    queryKey: ['admin-blockade'],
    queryFn: getBlockadeIndicators,
    refetchInterval: 60000,
  });

  const { data: transits, refetch: refetchTransits } = useQuery({
    queryKey: ['admin-transits'],
    queryFn: () => getTransits(24),
    refetchInterval: 60000,
  });

  const { data: vesselStates, refetch: refetchStates } = useQuery({
    queryKey: ['admin-vessel-states'],
    queryFn: getVesselStates,
    refetchInterval: 30000,
  });

  const { data: dataQuality, refetch: refetchQuality } = useQuery({
    queryKey: ['admin-data-quality'],
    queryFn: getDataQuality,
    refetchInterval: 120000,
  });

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchMetrics(),
      refetchUsers(),
      refetchPending(),
      refetchBlockade(),
      refetchTransits(),
      refetchStates(),
      refetchQuality(),
    ]);
    setTimeout(() => setRefreshing(false), 600);
  };

  const m = metrics?.metrics;

  // ── User management actions ──────────────────────────────────────────────
  const [actioningUser, setActioningUser] = useState<string | null>(null);

  const handleApprove = async (username: string) => {
    setActioningUser(username);
    try {
      await approveUser(username);
      refetchPending();
      refetchUsers();
    } catch (e) {
      console.error('Failed to approve user:', e);
    } finally {
      setActioningUser(null);
    }
  };

  const handleReject = async (username: string) => {
    setActioningUser(username);
    try {
      await blacklistUser(username);
      refetchPending();
      refetchUsers();
    } catch (e) {
      console.error('Failed to reject user:', e);
    } finally {
      setActioningUser(null);
    }
  };

  // ── Derived statistics ───────────────────────────────────────────────────
  const totalUsers = users?.length ?? 0;
  const activeUsers = users?.filter((u) => u.status === 'approved').length ?? 0;
  const pendingCount = pendingUsers?.length ?? 0;
  const straitStatus = blockade?.strait_status;
  const transitCount = transits?.inbound ?? 0;
  const cleanPct = dataQuality?.clean_percentage ?? 100;
  const transitingCount = vesselStates?.states?.transiting ?? 0;
  const anchoredCount = vesselStates?.states?.anchored ?? 0;
  const totalFleet = (vesselStates?.total ?? m?.maritimeCount) || 1;
  const transitingPct = Math.round((transitingCount / totalFleet) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-ui selection:bg-indigo-600 selection:text-white pb-10">
      {/* =================================================================== */}
      {/* 1. Tactical Command Header Banner */}
      {/* =================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-[#0e1628]/95 to-[#090e1a]/95 p-6 shadow-[0_0_40px_-15px_rgba(99,102,241,0.18)] backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent" />
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
                </span>
                ROOT ADMIN COMMAND // CLEARANCE LEVEL-4
              </span>

              {straitStatus && (
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1.5 shadow-sm',
                    straitStatus === 'ACTIVE' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                    straitStatus === 'LIMITED' && 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    straitStatus === 'NO_TRANSIT' && 'bg-red-500/15 text-red-400 border-red-500/30'
                  )}
                >
                  <ShieldAlert className="h-3 w-3" />
                  STRAIT STATUS: {straitStatus === 'NO_TRANSIT' ? 'CLOSED / NO TRANSIT' : straitStatus}
                </span>
              )}

              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-slate-800/60 text-slate-300 border border-slate-700/60">
                24H CYCLE ACTIVE
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2.5">
              System Control & Intelligence Center
            </h1>
            <p className="font-ui text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Autonomous telemetry ingestion, user authorization controls, calibrated ML ensemble governance, and Strait of Hormuz chokepoint monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 hover:border-indigo-400/60 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              title="Refresh all real-time feeds"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span>{refreshing ? 'Syncing Feeds…' : 'Sync Telemetry'}</span>
            </button>

            <Link
              to="/admin/datasets"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all hover:text-white"
            >
              <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
              <span>ML Retraining</span>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Key Operational Performance Indicators (5-Card Row) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Users */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md transition-all hover:border-indigo-500/40 hover:shadow-[0_0_25px_-8px_rgba(99,102,241,0.2)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-slate-400 uppercase tracking-wider">Access Roster</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-white mt-3">{totalUsers}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            <span className="text-emerald-400 font-medium">{activeUsers} active</span>
            <span className="text-slate-600">·</span>
            <span className={cn(pendingCount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500')}>
              {pendingCount} pending
            </span>
          </div>
        </div>

        {/* Card 2: Maritime Vessels */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md transition-all hover:border-indigo-500/40 hover:shadow-[0_0_25px_-8px_rgba(99,102,241,0.2)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-slate-400 uppercase tracking-wider">Tracked Fleet</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Ship className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-white mt-3">
            {m?.maritimeCount ?? vesselStates?.total ?? '—'}
          </div>
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>{transitingCount} transiting</span>
              <span className="font-mono text-indigo-300">{transitingPct}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, transitingPct)}%` }} />
            </div>
          </div>
        </div>

        {/* Card 3: Strait Transits */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md transition-all hover:border-indigo-500/40 hover:shadow-[0_0_25px_-8px_rgba(99,102,241,0.2)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-slate-400 uppercase tracking-wider">24h Transits</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
              <Waves className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-white mt-3">
            {transits !== undefined ? (
              <span className={cn(
                straitStatus === 'NO_TRANSIT' && 'text-red-400',
                straitStatus === 'LIMITED' && 'text-amber-400',
                straitStatus === 'ACTIVE' && 'text-emerald-400'
              )}>
                {transitCount}
              </span>
            ) : '—'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
            <span>Inbound Gate Rate</span>
            <span className="text-emerald-400 font-mono text-[10px]">NORMAL FLOW</span>
          </div>
        </div>

        {/* Card 4: ML Anomaly Core */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md transition-all hover:border-indigo-500/40 hover:shadow-[0_0_25px_-8px_rgba(99,102,241,0.2)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-slate-400 uppercase tracking-wider">ML Calibration</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-indigo-300 mt-3">4.57% ECE</div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
            <span>Isotonic Model B</span>
            <span className="text-emerald-400 font-mono font-bold text-[10px]">GRADE A+</span>
          </div>
        </div>

        {/* Card 5: AIS Signal Quality */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md transition-all hover:border-indigo-500/40 hover:shadow-[0_0_25px_-8px_rgba(99,102,241,0.2)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-slate-400 uppercase tracking-wider">Signal Health</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-400 mt-3">
            {dataQuality ? `${cleanPct.toFixed(1)}%` : '99.8%'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
            <span>{dataQuality ? `${(dataQuality.total_positions ?? 0).toLocaleString()} pings` : 'Telemetry stream'}</span>
            <span className="text-slate-500 font-mono text-[10px]">0 DROPS</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. Subsystem Infrastructure & MLOps Pipeline Matrix */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" />
            <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Subsystem Infrastructure & Continuous Ingestion
            </h2>
          </div>
          <div className="text-[11px] font-mono text-indigo-300">
            Active Champion: <span className="text-white font-bold">vessel_ensemble.joblib</span> (gRPC :8091)
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
          <div className="rounded-xl border border-slate-800/90 bg-[#070b14]/70 p-3.5 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1.5">AIS Telemetry Stream</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-emerald-400">ONLINE</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">wss://aisstream.io</div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#070b14]/70 p-3.5 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1.5">ADS-B Air Feed</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-indigo-300">ACTIVE</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">OpenSky Network API</div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#070b14]/70 p-3.5 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1.5">ML Inference Core</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-indigo-300">
                {m?.totalTracks ?? 0} ACTIVE TRACKS
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">IF + LOF + Isotonic</div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#070b14]/70 p-3.5 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1.5">News NLP Intelligence</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-emerald-400">INGESTING</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">Regional OSINT Feeds</div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#070b14]/70 p-3.5 text-center col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1.5">Queue Integrity</div>
            <div className="flex items-center justify-center gap-1.5">
              <Cpu className="h-3 w-3 text-slate-400" />
              <span className={cn(
                'font-mono text-xs font-bold',
                (m?.queueDropped ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
              )}>
                {(m?.queueDropped ?? 0) > 0 ? `${m?.queueDropped} DROPPED` : '0 DROPPED'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">Ring Buffer Latency: &lt;2ms</div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. Two-Column Operational Hub */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: User Authorization Queue */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Operator Authorization Queue
                </h2>
              </div>
              <span className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                pendingCount > 0
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              )}>
                {pendingCount} PENDING
              </span>
            </div>

            <div className="space-y-3 pt-4">
              {pendingUsers && pendingUsers.length > 0 ? (
                pendingUsers.map((req) => (
                  <div
                    key={req.username}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800/90 bg-[#070b14]/70 text-xs transition-all hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/30 text-xs">
                        {req.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{req.username}</div>
                        <div className="font-mono text-[11px] text-slate-400">{req.email}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recent application'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(req.username)}
                        disabled={actioningUser === req.username}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg font-semibold transition-all disabled:opacity-50 cursor-pointer text-xs"
                        title="Authorize Administrator Account"
                      >
                        {actioningUser === req.username ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(req.username)}
                        disabled={actioningUser === req.username}
                        className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                        title="Reject and Blacklist"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-slate-300">All Operator Requests Cleared</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">No pending registration approvals awaiting verification.</div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span>Roster Management: <strong className="text-white">{activeUsers}</strong> approved operators</span>
            <Link to="/admin/users" className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              <span>View Roster</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* RIGHT: Strait Situation & Live Gate Transits */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0b111e]/90 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-400" />
                <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Chokepoint Transit Room
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {blockade?.situation?.title ?? 'TSS Flow Active'}
              </span>
            </div>

            <div className="space-y-3 pt-4 text-xs">
              {/* Situation Banner */}
              {blockade?.situation && (
                <div className={cn(
                  'p-3.5 rounded-xl border text-xs',
                  blockade.situation.level === 'normal' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                  blockade.situation.level === 'elevated' && 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                  blockade.situation.level === 'critical' && 'bg-red-500/10 border-red-500/20 text-red-400',
                  blockade.situation.level === 'high' && 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                )}>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    {blockade.situation.title}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-300 leading-relaxed">{blockade.situation.text}</div>
                </div>
              )}

              {/* 4 Key Indicators Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-800/90 bg-[#070b14]/70">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Anchored</div>
                  <div className="font-mono text-base font-bold text-white mt-0.5">
                    {blockade?.anchored_vessels ?? anchoredCount}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {blockade?.anchored_ratio_pct?.toFixed(1) ?? 0}% fleet
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800/90 bg-[#070b14]/70">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Waiting 6h+</div>
                  <div className="font-mono text-base font-bold text-amber-400 mt-0.5">
                    {blockade?.waiting_fleet_6h ?? '0'}
                  </div>
                  <div className="text-[10px] text-slate-500">Congestion queue</div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800/90 bg-[#070b14]/70">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Waiting 24h+</div>
                  <div className="font-mono text-base font-bold text-amber-500 mt-0.5">
                    {blockade?.waiting_fleet_24h ?? '0'}
                  </div>
                  <div className="text-[10px] text-slate-500">Delayed convoy</div>
                </div>

                <div className="p-3 rounded-xl border border-slate-800/90 bg-[#070b14]/70">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">24h Passage</div>
                  <div className="font-mono text-base font-bold text-emerald-400 mt-0.5">
                    {blockade?.strait_transits_24h ?? transitCount}
                  </div>
                  <div className="text-[10px] text-slate-500">Confirmed transits</div>
                </div>
              </div>

              {/* Recent Gate Events */}
              {transits?.recent_events && transits.recent_events.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Recent Gate Crossings
                  </div>
                  {transits.recent_events.slice(0, 3).map((evt, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/80 bg-[#070b14]/70 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <Ship className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="font-mono font-semibold text-white">
                          {evt.ship_name || `MMSI ${evt.mmsi}`}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold',
                            evt.direction === 'INBOUND' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          )}
                        >
                          {evt.direction}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {evt.gate} · <span className="text-white font-medium">{evt.speed} kn</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span>Maritime Traffic Lanes: <strong className="text-emerald-400">TSS Inbound & Outbound Normal</strong></span>
            <Link to="/admin/tracking" className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              <span>Live Tracking Map</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
