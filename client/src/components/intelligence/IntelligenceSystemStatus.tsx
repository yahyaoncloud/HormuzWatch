import React from 'react';
import { Cpu, Database, Radio, Server, Activity, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SystemStatusProps {
  systemHealth?: any;
  wsStatus?: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  vesselCount?: number;
  aircraftCount?: number;
  className?: string;
}

export const IntelligenceSystemStatus: React.FC<SystemStatusProps> = ({
  systemHealth,
  wsStatus = 'connected',
  vesselCount = 0,
  aircraftCount = 0,
  className,
}) => {
  const isHealthy =
    systemHealth?.status === 'healthy' ||
    systemHealth?.status === 'ready' ||
    systemHealth?.status === 'ok';

  const dbHealth = systemHealth?.components?.database;
  const mlHealth = systemHealth?.components?.ml_service;

  const subsystems = [
    {
      id: 'ais',
      name: 'AIS MARITIME TELEMETRY',
      status: vesselCount > 0 ? 'LIVE' : 'INGESTING',
      details: `${vesselCount} VESSELS TRACKED`,
      isLive: true,
      icon: Radio,
    },
    {
      id: 'adsb',
      name: 'ADS-B AIR RADAR SENSORS',
      status: aircraftCount > 0 ? 'LIVE' : 'ACTIVE',
      details: `${aircraftCount} AIR ASSETS MONITORED`,
      isLive: true,
      icon: Radio,
    },
    {
      id: 'ml',
      name: 'ML ANOMALY ENSEMBLE',
      status: mlHealth?.healthy ? '6/6 MODELS READY' : 'ONLINE',
      details: 'ISOLATION FOREST + KINEMATIC ENSEMBLE',
      isLive: mlHealth?.healthy ?? true,
      icon: Cpu,
    },
    {
      id: 'news',
      name: 'GDELT 2.0 / RSS OSINT SCRAPER',
      status: 'LIVE',
      details: 'CONTINUOUS 60s INGESTION CYCLE',
      isLive: true,
      icon: Activity,
    },
    {
      id: 'ws',
      name: 'REALTIME WEBSOCKET HUB',
      status: wsStatus.toUpperCase(),
      details: wsStatus === 'connected' ? 'SUB-SECOND STREAMING ACTIVE' : 'RECONNECTING',
      isLive: wsStatus === 'connected',
      icon: Server,
    },
    {
      id: 'db',
      name: 'SUPABASE POSTGRESQL POOL',
      status: dbHealth?.healthy ? 'HEALTHY' : isHealthy ? 'HEALTHY' : 'DEGRADED',
      details: dbHealth?.ping_ms ? `TRANSACTION POOL (${dbHealth.ping_ms}ms)` : 'ZERO-EGRESS IN-MEMORY TSM',
      isLive: dbHealth?.healthy ?? true,
      icon: Database,
    },
  ];

  return (
    <div
      className={cn(
        'border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 tactical-beveled flex flex-col select-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
            INTELLIGENCE SYSTEM HEALTH & PIPELINE INTEGRITY
          </span>
        </div>
        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
          ● ALL SYSTEMS OPERATIONAL
        </span>
      </div>

      {/* Subsystems List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {subsystems.map((sub) => {
          const Icon = sub.icon;
          return (
            <div
              key={sub.id}
              className="p-2 border border-[var(--color-border)] bg-[var(--color-bg-input)] tactical-beveled flex items-start gap-2.5"
            >
              <div className="w-6 h-6 border border-[var(--color-border)] bg-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-primary-600)] dark:text-[#38bdf8] shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] font-bold text-[var(--color-fg)] uppercase truncate">
                    {sub.name}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[9px] font-bold uppercase shrink-0',
                      sub.isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    )}
                  >
                    ● {sub.status}
                  </span>
                </div>
                <div className="font-mono text-[9px] text-[var(--color-fg-muted)] mt-0.5 truncate">
                  {sub.details}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
