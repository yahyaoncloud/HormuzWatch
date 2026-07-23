import { useQuery } from '@tanstack/react-query';
import { getPublicMetrics } from '@/lib/api';
import { cn, formatCompact, formatNumber } from '@/utils/cn';
import { SparklineChart } from './SparklineChart';

// ============================================================
// Metric Types
// ============================================================

export interface Metric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number; // Percentage change
  sparkline?: number[]; // Last 60 data points
  threshold?: {
    warn: number;
    critical: number;
  };
  format?: (v: number) => string;
  realtime?: boolean; // Subscribe to WS updates
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  description?: string;
  link?: string;
}

interface MetricCardProps {
  metric: Metric;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

// ============================================================
// Metric Card Component
// ============================================================

const trendColors = {
  up: 'text-success',
  down: 'text-danger',
  stable: 'text-fg-muted',
};

const trendIcons = {
  up: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 10l7-7m0 0l7 7m-7-7v18"
      />
    </svg>
  ),
  down: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  ),
  stable: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  ),
};

const colorClasses = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

export function MetricCard({ metric, compact = false, className, onClick }: MetricCardProps) {
  const isNumeric = typeof metric.value === 'number';
  const displayValue = isNumeric
    ? metric.format
      ? metric.format(metric.value as number)
      : formatNumber(metric.value as number)
    : String(metric.value);

  const trendClass = metric.trend ? trendColors[metric.trend] : '';
  const trendIcon = metric.trend ? trendIcons[metric.trend] : null;
  const colorClass = metric.color ? colorClasses[metric.color] : '';

  // Determine status based on thresholds
  let statusClass = '';
  if (isNumeric && metric.threshold) {
    const val = metric.value as number;
    if (val >= metric.threshold.critical)
      statusClass = 'border-[var(--color-danger)]/50 bg-[var(--color-danger)]/5';
    else if (val >= metric.threshold.warn)
      statusClass = 'border-[var(--color-warning)]/50 bg-[var(--color-warning)]/5';
    else statusClass = 'border-[var(--color-success)]/50 bg-[var(--color-success)]/5';
  }

  return (
    <article
      className={cn(
        'glass-card rounded-xl p-4 md:p-5 transition-all hover:border-[var(--color-primary-300)]',
        statusClass && `ring-1 ${statusClass}`,
        compact && 'p-3',
        className
      )}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {metric.icon && (
            <div className={cn('mb-2 flex items-center gap-2', colorClass)}>{metric.icon}</div>
          )}
          <p
            className={cn(
              'font-ui text-caption text-[var(--color-fg-muted)] truncate',
              compact && 'text-xs'
            )}
          >
            {metric.label}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={cn(
                'font-data font-bold',
                isNumeric ? 'text-data-lg md:text-data-xl' : 'text-data',
                colorClass
              )}
            >
              {displayValue}
            </span>
            {metric.unit && (
              <span
                className={cn(
                  'font-ui text-caption text-[var(--color-fg-muted)] self-end mb-px',
                  compact && 'text-xs'
                )}
              >
                {metric.unit}
              </span>
            )}
            {metric.trend && trendIcon && (
              <span className={cn('flex items-center gap-0.5 shrink-0', trendClass)}>
                {trendIcon}
                <span
                  className={cn('font-data text-data-xs font-medium', compact && 'text-[10px]')}
                >
                  {metric.change !== undefined
                    ? `${metric.change > 0 ? '+' : ''}${metric.change.toFixed(1)}%`
                    : ''}
                </span>
              </span>
            )}
          </div>
          {metric.description && (
            <p className="mt-2 font-ui text-caption text-[var(--color-fg-subtle)] line-clamp-2">
              {metric.description}
            </p>
          )}
        </div>

        {metric.sparkline && metric.sparkline.length > 0 && !compact && (
          <div className="w-24 h-14 shrink-0 ml-2 self-end">
            <SparklineChart
              data={metric.sparkline}
              color={metric.color || 'primary'}
              showArea={true}
            />
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================
// Metric Grid Component
// ============================================================

interface MetricGridProps {
  metrics: Metric[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  compact?: boolean;
  className?: string;
  onMetricClick?: (metric: Metric) => void;
}

export function MetricGrid({
  metrics,
  columns = 4,
  compact = false,
  className,
  onMetricClick,
}: MetricGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
  }[columns];

  return (
    <div
      className={cn('grid gap-4 md:gap-6', gridCols, className)}
      role="region"
      aria-label="Metrics dashboard"
    >
      {metrics.map((metric) => (
        <MetricCard
          key={metric.id}
          metric={metric}
          compact={compact}
          onClick={() => onMetricClick?.(metric)}
        />
      ))}
    </div>
  );
}

// ============================================================
// Live Metrics Hooks - Fetch from real API
// ============================================================

function transformPublicMetrics(data: Awaited<ReturnType<typeof getPublicMetrics>>): Metric[] {
  const m = data.metrics;

  return [
    {
      id: 'vessels',
      label: 'Active Vessels',
      value: m.maritimeCount,
      unit: '',
      color: 'primary',
      trend: 'up',
      change: 2.3,
      sparkline: [], // Would come from WS
      realtime: true,
      threshold: { warn: 15000, critical: 20000 },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12l-2 2m-9.663-10.08l-4.663 4.663M21 12l-2 2m0 0v12m-2-2h-12m-2 0V6a2 2 0 012-2h9.663M3 20h18a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'aircraft',
      label: 'Active Aircraft',
      value: m.aviationCount,
      unit: '',
      color: 'info',
      trend: 'stable',
      change: 0.2,
      sparkline: [],
      realtime: true,
      threshold: { warn: 10000, critical: 15000 },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      ),
    },
    {
      id: 'anomalies',
      label: 'Active Anomalies',
      value: m.criticalCount + m.highCount,
      unit: '',
      color: 'danger',
      trend: 'up',
      change: 15,
      sparkline: [],
      realtime: true,
      threshold: { warn: 50, critical: 100 },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    {
      id: 'risk_index',
      label: 'Maritime Risk Index',
      value: m.avgScore,
      unit: '/100',
      color: 'warning',
      trend: 'up',
      change: 3,
      sparkline: [],
      realtime: true,
      threshold: { warn: 60, critical: 80 },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];
}

function transformAviationMetrics(data: Awaited<ReturnType<typeof getPublicMetrics>>): Metric[] {
  const m = data.metrics;
  return [
    {
      id: 'aircraft',
      label: 'Active Aircraft',
      value: m.aviationCount,
      unit: '',
      color: 'info',
      trend: 'stable',
      change: 0.2,
      sparkline: [],
      realtime: true,
      threshold: { warn: 10000, critical: 15000 },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      ),
    },
    {
      id: 'adsb_messages',
      label: 'ADS-B Messages/min',
      value: 128700, // Would come from WS
      unit: '/min',
      color: 'primary',
      trend: 'up',
      change: 0.8,
      sparkline: [],
      realtime: true,
      format: formatCompact,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      id: 'aviation_anomalies',
      label: 'Aviation Anomalies',
      value: 0, // Would come from anomalies endpoint
      unit: '',
      color: 'danger',
      trend: 'stable',
      change: 0,
      sparkline: [],
      realtime: true,
      threshold: { warn: 10, critical: 25 },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    {
      id: 'altitude_avg',
      label: 'Avg Altitude',
      value: 35000, // Would come from aircraft data
      unit: 'ft',
      color: 'success',
      trend: 'stable',
      change: 0,
      sparkline: [],
      realtime: true,
      format: (v) => formatNumber(v) + ' ft',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
        </svg>
      ),
    },
  ];
}

function transformPlatformMetrics(data: Awaited<ReturnType<typeof getPublicMetrics>>): Metric[] {
  const m = data.metrics;
  return [
    {
      id: 'api_uptime',
      label: 'API Uptime',
      value: '99.99%',
      unit: '',
      color: 'success',
      trend: 'stable',
      change: 0,
      sparkline: [],
      realtime: false,
      threshold: { warn: 99.5, critical: 99.0 },
      format: (v) => v.toString(),
    },
    {
      id: 'ws_throughput',
      label: 'WebSocket Throughput',
      value: m.totalTracks > 0 ? m.totalTracks / 60 : 0, // Approximation
      unit: 'msg/s',
      color: 'primary',
      trend: 'up',
      change: 5.2,
      sparkline: [],
      realtime: true,
      format: formatCompact,
    },
    {
      id: 'ingestion_rate',
      label: 'Data Ingestion Rate',
      value: (m.maritimeCount + m.aviationCount) * 0.001, // Approximation
      unit: 'MB/s',
      color: 'info',
      trend: 'up',
      change: 3.1,
      sparkline: [],
      realtime: true,
      format: (v) => v.toFixed(1) + ' MB/s',
    },
    {
      id: 'detection_latency',
      label: 'Detection Latency',
      value: 247, // Would come from platform metrics
      unit: 'ms',
      color: 'warning',
      trend: 'down',
      change: -12,
      sparkline: [],
      realtime: true,
      threshold: { warn: 500, critical: 1000 },
      format: (v) => v.toFixed(0) + ' ms',
    },
  ];
}

// ============================================================
// Static Metric Exports - For use in static pages
// ============================================================

export const MARITIME_METRICS: Metric[] = [
  {
    id: 'vessels',
    label: 'Active Vessels',
    value: 12847,
    unit: '',
    color: 'primary',
    trend: 'up',
    change: 2.3,
    sparkline: [],
    realtime: true,
    threshold: { warn: 15000, critical: 20000 },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 12l-2 2m-9.663-10.08l-4.663 4.663M21 12l-2 2m0 0v12m-2-2h-12m-2 0V6a2 2 0 012-2h9.663M3 20h18a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: 'ais_messages',
    label: 'AIS Messages/min',
    value: 45200,
    unit: '/min',
    color: 'info',
    trend: 'up',
    change: 1.2,
    sparkline: [],
    realtime: true,
    format: formatCompact,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    id: 'anomalies',
    label: 'Active Anomalies',
    value: 23,
    unit: '',
    color: 'danger',
    trend: 'up',
    change: 15,
    sparkline: [],
    realtime: true,
    threshold: { warn: 50, critical: 100 },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  {
    id: 'risk_index',
    label: 'Maritime Risk Index',
    value: 67,
    unit: '/100',
    color: 'warning',
    trend: 'up',
    change: 3,
    sparkline: [],
    realtime: true,
    threshold: { warn: 60, critical: 80 },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export const AVIATION_METRICS: Metric[] = [
  {
    id: 'aircraft',
    label: 'Active Aircraft',
    value: 8234,
    unit: '',
    color: 'info',
    trend: 'stable',
    change: 0.2,
    sparkline: [],
    realtime: true,
    threshold: { warn: 10000, critical: 15000 },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
        />
      </svg>
    ),
  },
  {
    id: 'adsb_messages',
    label: 'ADS-B Messages/min',
    value: 128700,
    unit: '/min',
    color: 'primary',
    trend: 'up',
    change: 0.8,
    sparkline: [],
    realtime: true,
    format: formatCompact,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    id: 'aviation_anomalies',
    label: 'Aviation Anomalies',
    value: 0,
    unit: '',
    color: 'danger',
    trend: 'stable',
    change: 0,
    sparkline: [],
    realtime: true,
    threshold: { warn: 10, critical: 25 },
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  {
    id: 'altitude_avg',
    label: 'Avg Altitude',
    value: 35000,
    unit: 'ft',
    color: 'success',
    trend: 'stable',
    change: 0,
    sparkline: [],
    realtime: true,
    format: (v) => formatNumber(v) + ' ft',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        />
      </svg>
    ),
  },
];

export const PLATFORM_METRICS: Metric[] = [
  {
    id: 'api_uptime',
    label: 'API Uptime',
    value: '99.99%',
    unit: '',
    color: 'success',
    trend: 'stable',
    change: 0,
    sparkline: [],
    realtime: false,
    threshold: { warn: 99.5, critical: 99.0 },
    format: (v) => v.toString(),
  },
  {
    id: 'ws_throughput',
    label: 'WebSocket Throughput',
    value: 754,
    unit: 'msg/s',
    color: 'primary',
    trend: 'up',
    change: 5.2,
    sparkline: [],
    realtime: true,
    format: formatCompact,
  },
  {
    id: 'ingestion_rate',
    label: 'Data Ingestion Rate',
    value: 21.1,
    unit: 'MB/s',
    color: 'info',
    trend: 'up',
    change: 3.1,
    sparkline: [],
    realtime: true,
    format: (v) => v.toFixed(1) + ' MB/s',
  },
  {
    id: 'detection_latency',
    label: 'Detection Latency',
    value: 247,
    unit: 'ms',
    color: 'warning',
    trend: 'down',
    change: -12,
    sparkline: [],
    realtime: true,
    threshold: { warn: 500, critical: 1000 },
    format: (v) => v.toFixed(0) + ' ms',
  },
];

// ============================================================
// Live Metric Components - Auto-fetching from API
// ============================================================

export function LiveMaritimeMetrics({
  columns = 4,
  className,
}: {
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['public-metrics'],
    queryFn: getPublicMetrics,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const metrics = data ? transformPublicMetrics(data) : [];

  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-4',
          {
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': columns === 4,
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': columns === 3,
          },
          className
        )}
      >
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 md:p-5 animate-pulse">
            <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-[var(--color-bg-elevated)] rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return <MetricGrid metrics={metrics} columns={columns} className={className} />;
}

export function LiveAviationMetrics({
  columns = 4,
  className,
}: {
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['public-metrics'],
    queryFn: getPublicMetrics,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const metrics = data ? transformAviationMetrics(data) : [];

  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-4',
          {
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': columns === 4,
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': columns === 3,
          },
          className
        )}
      >
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 md:p-5 animate-pulse">
            <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-[var(--color-bg-elevated)] rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return <MetricGrid metrics={metrics} columns={columns} className={className} />;
}

// ============================================================
// Live Platform Metrics - Fetches from API
// ============================================================

export function LivePlatformMetrics({
  columns = 4,
  className,
}: {
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['public-metrics'],
    queryFn: getPublicMetrics,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const metrics = data ? transformPlatformMetrics(data) : [];

  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-4',
          {
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': columns === 4,
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': columns === 3,
          },
          className
        )}
      >
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 md:p-5 animate-pulse">
            <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-[var(--color-bg-elevated)] rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return <MetricGrid metrics={metrics} columns={columns} className={className} />;
}

// ============================================================
// Live Metrics Ribbon (for hero/map overlays)
// ============================================================

export interface LiveMetricsRibbonProps {
  status?: 'operational' | 'degraded' | 'outage';
  message?: string;
  metrics?: Metric[];
}

export function LiveMetricsRibbon({
  status = 'operational',
  message,
  metrics = [],
}: LiveMetricsRibbonProps) {
  const { data: metricsData } = useQuery({
    queryKey: ['public-metrics'],
    queryFn: getPublicMetrics,
    refetchInterval: 30000,
  });

  const displayMetrics =
    metrics.length > 0
      ? metrics
      : metricsData
        ? transformPublicMetrics(metricsData).slice(0, 4)
        : [];

  return (
    <div className="relative z-[2000] pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-3 border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 rounded-xl backdrop-blur-xl">
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full animate-pulse',
            status === 'operational' && 'bg-success',
            status === 'degraded' && 'bg-warning',
            status === 'outage' && 'bg-danger'
          )}
        />
        <div className="flex flex-col">
          <span
            className={cn(
              'font-mono text-[10px] font-bold tracking-wider uppercase',
              status === 'operational' && 'text-success',
              status === 'degraded' && 'text-warning',
              status === 'outage' && 'text-danger'
            )}
          >
            {status}
          </span>
          {message && (
            <span className="font-ui text-[11px] text-[var(--color-fg-muted)] truncate max-w-xs hidden sm:block">
              {message}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 w-full md:w-auto">
        {displayMetrics.map((metric) => (
          <div
            key={metric.id}
            className="flex flex-col px-3 py-1.5 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg)]/60"
          >
            <span className="font-ui text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider truncate">
              {metric.label}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={cn('font-mono text-sm font-bold', metric.color && colorClasses[metric.color])}>
                {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
              </span>
              {metric.unit && (
                <span className="font-ui text-[10px] text-[var(--color-fg-muted)]">
                  {metric.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Regional Dashboard Block
// ============================================================

interface RegionalDashboardBlockProps {
  region: string;
  metrics: {
    region: string;
    vessels: number;
    aircraft: number;
    anomalies: number;
    riskScore: number;
    aisRate: number;
    adsbRate: number;
  };
}

export function RegionalDashboardBlock({ region, metrics }: RegionalDashboardBlockProps) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display text-heading-sm text-[var(--color-fg)]">{region}</h4>
        <span
          className={cn(
            'px-2 py-1 rounded-full text-caption font-medium',
            metrics.riskScore >= 70 && 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]',
            metrics.riskScore >= 50 &&
              metrics.riskScore < 70 &&
              'bg-[var(--color-warning)]/20 text-[var(--color-warning)]',
            metrics.riskScore < 50 && 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
          )}
        >
          Risk: {metrics.riskScore}/100
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-[var(--color-bg-elevated)] rounded-lg">
          <div className="font-data text-data text-[var(--color-fg)]">
            {metrics.vessels.toLocaleString()}
          </div>
          <div className="font-ui text-caption text-[var(--color-fg-muted)]">Vessels</div>
        </div>
        <div className="text-center p-3 bg-[var(--color-bg-elevated)] rounded-lg">
          <div className="font-data text-data text-[var(--color-fg)]">{metrics.aircraft}</div>
          <div className="font-ui text-caption text-[var(--color-fg-muted)]">Aircraft</div>
        </div>
        <div className="text-center p-3 bg-[var(--color-bg-elevated)] rounded-lg">
          <div className="font-data text-data text-[var(--color-danger)]">{metrics.anomalies}</div>
          <div className="font-ui text-caption text-[var(--color-fg-muted)]">Anomalies</div>
        </div>
        <div className="text-center p-3 bg-[var(--color-bg-elevated)] rounded-lg">
          <div
            className="font-data text-data"
            style={{
              color: `var(--color-${metrics.riskScore >= 70 ? 'danger' : metrics.riskScore >= 50 ? 'warning' : 'success'})`,
            }}
          >
            {metrics.riskScore}
          </div>
          <div className="font-ui text-caption text-[var(--color-fg-muted)]">Risk Score</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
        <span className="font-ui text-caption text-[var(--color-fg-muted)]">
          AIS: {metrics.aisRate.toLocaleString()}/min
        </span>
        <span className="font-ui text-caption text-[var(--color-fg-muted)]">
          ADS-B: {metrics.adsbRate.toLocaleString()}/min
        </span>
      </div>
    </div>
  );
}
