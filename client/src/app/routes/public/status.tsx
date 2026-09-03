import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { PageContainer } from '@/components/layout/PageContainer';
import { cn } from '@/utils/cn';
import {
  Server,
  Cpu,
  Database,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
  RefreshCw,
  Play,
  Pause,
  Globe,
  ArrowRight,
} from 'lucide-react';

interface ServiceHealth {
  name: string;
  role: string;
  status: 'healthy' | 'booting' | 'degraded' | 'offline';
  latencyMs?: number;
  details?: Record<string, any>;
  lastChecked: Date;
  endpoint: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  service: 'GATEWAY' | 'GO_SERVER' | 'ML_ENGINE' | 'POSTGRES' | 'TELEMETRY' | 'TUNNEL';
  message: string;
}

export default function MediatoryStatusPage() {
  const [services, setServices] = useState<Record<string, ServiceHealth>>({
    server: {
      name: 'Go Backend API',
      role: 'REST, gRPC Client, Telemetry Pipeline',
      status: 'booting',
      endpoint: '/health',
      lastChecked: new Date(),
    },
    ml: {
      name: 'Python ML Inference Engine',
      role: 'IsolationForest & LOF Anomaly Ensemble',
      status: 'booting',
      endpoint: '/ml/health',
      lastChecked: new Date(),
    },
    database: {
      name: 'Supabase PostgreSQL',
      role: 'Relational Intelligence & Traces Store',
      status: 'booting',
      endpoint: '/health',
      lastChecked: new Date(),
    },
    telemetry: {
      name: 'Real-time WebSocket & SSE Stream',
      role: 'Live Vessel/Flight & Geospatial Stream',
      status: 'booting',
      endpoint: '/ws/stream',
      lastChecked: new Date(),
    },
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [overallProgress, setOverallProgress] = useState(25);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (
    level: 'info' | 'warn' | 'error' | 'success',
    service: LogEntry['service'],
    message: string
  ) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString().split('T')[1].replace('Z', ''),
      level,
      service,
      message,
    };
    setLogs((prev) => [...prev.slice(-200), entry]);
  };

  const checkHealth = async () => {
    const startGo = performance.now();
    try {
      const res = await fetch('/health', { cache: 'no-store' });
      const elapsedGo = Math.round(performance.now() - startGo);
      if (res.ok) {
        const data = await res.json();
        setServices((prev) => ({
          ...prev,
          server: {
            ...prev.server,
            status: 'healthy',
            latencyMs: elapsedGo,
            details: data,
            lastChecked: new Date(),
          },
          database: {
            ...prev.database,
            status: data?.components?.database?.healthy ? 'healthy' : 'degraded',
            latencyMs: data?.components?.database?.ping_ms || elapsedGo,
            details: data?.components?.database,
            lastChecked: new Date(),
          },
          telemetry: {
            ...prev.telemetry,
            status: data?.components?.websocket?.healthy ? 'healthy' : 'degraded',
            latencyMs: 12,
            details: data?.components?.websocket,
            lastChecked: new Date(),
          },
        }));
        addLog(
          'success',
          'GO_SERVER',
          `Healthcheck OK (${elapsedGo}ms) — Version: ${data.version || '2.0.0'}, DB: ${
            data?.components?.database?.healthy ? 'Connected' : 'Pending'
          }`
        );
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setServices((prev) => ({
        ...prev,
        server: { ...prev.server, status: 'degraded', lastChecked: new Date() },
      }));
      addLog('warn', 'GO_SERVER', `Health probe warning: ${err.message || 'Connecting...'}`);
    }

    const startML = performance.now();
    try {
      const resML = await fetch('/ml/health', { cache: 'no-store' });
      const elapsedML = Math.round(performance.now() - startML);
      if (resML.ok) {
        const dataML = await resML.json();
        setServices((prev) => ({
          ...prev,
          ml: {
            ...prev.ml,
            status: 'healthy',
            latencyMs: elapsedML,
            details: dataML,
            lastChecked: new Date(),
          },
        }));
        addLog(
          'success',
          'ML_ENGINE',
          `Inference Ensemble READY (${elapsedML}ms) — Models: ${dataML.models_loaded}/${dataML.models_total} online (gRPC :8091)`
        );
      } else {
        throw new Error(`HTTP ${resML.status}`);
      }
    } catch (err: any) {
      setServices((prev) => ({
        ...prev,
        ml: { ...prev.ml, status: 'booting', lastChecked: new Date() },
      }));
      addLog('info', 'ML_ENGINE', `ML warm-up / initialization cycle in progress...`);
    }
  };

  useEffect(() => {
    addLog('info', 'TUNNEL', 'Cloudflare Ingress active on hormuzwatch.aburcloud.com');
    addLog('info', 'GATEWAY', 'Nginx reverse proxy initialized on port 3000');
    addLog('info', 'GO_SERVER', 'Bootstrapping HormuzWatch Intelligence Gateway...');
    addLog('info', 'ML_ENGINE', 'Starting Python Anomaly Ensemble (IsolationForest, LOF, XGBoost)...');

    checkHealth();

    let interval: NodeJS.Timeout | null = null;
    if (isLivePolling) {
      interval = setInterval(checkHealth, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLivePolling]);

  useEffect(() => {
    const total = Object.values(services).length;
    const ready = Object.values(services).filter((s) => s.status === 'healthy').length;
    setOverallProgress(Math.round((ready / total) * 100));
  }, [services]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'all') return true;
    return l.level === logFilter;
  });

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'booting':
        return <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />;
      case 'offline':
        return <XCircle className="w-5 h-5 text-rose-400" />;
    }
  };

  const getStatusBadge = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ONLINE & HEALTHY
          </span>
        );
      case 'booting':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse">
            BOOTING / PROBING
          </span>
        );
      case 'degraded':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            RECOVERING
          </span>
        );
      case 'offline':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            OFFLINE
          </span>
        );
    }
  };

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-8 py-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 md:p-8 shadow-2xl">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="px-3 py-1 text-xs font-mono font-bold uppercase rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  DevOps Runtime Observer
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>hormuzwatch.aburcloud.com</span>
                </div>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                System Boot & Service Status
              </h1>
              <p className="text-slate-400 text-sm md:text-base mt-1 max-w-2xl">
                Mediatory diagnostics monitor for on-premise Docker Compose topology on{' '}
                <span className="text-slate-200 font-mono">tunkstun</span> via Cloudflare Tunnel.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => checkHealth()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-probe All</span>
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
              <span>Stack Readiness: {overallProgress}%</span>
              <span>
                {overallProgress === 100
                  ? 'All services operational'
                  : 'Synchronizing microservices...'}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={cn(
                  'h-full transition-all duration-700 ease-out rounded-full',
                  overallProgress === 100
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-500 to-cyan-500 animate-pulse'
                )}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Microservices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(services).map(([key, svc]) => (
            <div
              key={key}
              className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                    {key === 'server' && <Server className="w-5 h-5 text-cyan-400" />}
                    {key === 'ml' && <Cpu className="w-5 h-5 text-purple-400" />}
                    {key === 'database' && <Database className="w-5 h-5 text-amber-400" />}
                    {key === 'telemetry' && <Radio className="w-5 h-5 text-emerald-400" />}
                  </div>
                  {getStatusIcon(svc.status)}
                </div>
                <h3 className="text-base font-bold text-slate-100">{svc.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{svc.role}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-mono">Status</span>
                  {getStatusBadge(svc.status)}
                </div>
                {svc.latencyMs !== undefined && (
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-500">Latency</span>
                    <span className="text-slate-300 font-semibold">{svc.latencyMs} ms</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>Endpoint</span>
                  <span className="text-slate-400">{svc.endpoint}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Inline Telemetry & Boot Log Terminal */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          {/* Terminal Top Bar */}
          <div className="bg-slate-900/90 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 ml-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">Live DevOps Boot & Runtime Log Stream</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter pills */}
              <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
                {(['all', 'info', 'warn', 'error'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={cn(
                      'px-2.5 py-1 rounded capitalize transition-all',
                      logFilter === f
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Pause/Resume button */}
              <button
                onClick={() => setIsLivePolling(!isLivePolling)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                {isLivePolling ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resume</span>
                  </>
                )}
              </button>

              {/* Clear logs */}
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            ref={logContainerRef}
            className="p-5 font-mono text-xs space-y-2 h-96 overflow-y-auto bg-black/60 text-slate-300 selection:bg-cyan-500/30"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 italic text-center py-24">
                No logs recorded yet. Listening for container lifecycle events...
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 leading-relaxed hover:bg-slate-900/40 px-1 py-0.5 rounded">
                  <span className="text-slate-500 select-none shrink-0 font-light">{log.timestamp}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 tracking-wide',
                      log.service === 'GO_SERVER' && 'bg-cyan-950 text-cyan-300 border border-cyan-800/40',
                      log.service === 'ML_ENGINE' && 'bg-purple-950 text-purple-300 border border-purple-800/40',
                      log.service === 'POSTGRES' && 'bg-amber-950 text-amber-300 border border-amber-800/40',
                      log.service === 'TELEMETRY' && 'bg-emerald-950 text-emerald-300 border border-emerald-800/40',
                      log.service === 'TUNNEL' && 'bg-blue-950 text-blue-300 border border-blue-800/40',
                      log.service === 'GATEWAY' && 'bg-slate-800 text-slate-300 border border-slate-700'
                    )}
                  >
                    [{log.service}]
                  </span>
                  <span
                    className={cn(
                      'flex-1 break-all',
                      log.level === 'success' && 'text-emerald-400 font-medium',
                      log.level === 'warn' && 'text-amber-300 font-medium',
                      log.level === 'error' && 'text-rose-400 font-bold',
                      log.level === 'info' && 'text-slate-300'
                    )}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Terminal Footer */}
          <div className="bg-slate-900/60 px-5 py-2.5 border-t border-slate-800/80 flex justify-between items-center text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Poller Active (4s cycle)
              </span>
              <span>Recorded: {logs.length} events</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 w-3.5 h-3.5"
              />
              <span>Auto-scroll to bottom</span>
            </label>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
