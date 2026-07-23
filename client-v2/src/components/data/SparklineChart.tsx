import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import { cn, formatNumber } from '@/utils/cn';

// ============================================================
// Sparkline Chart using uPlot (high-performance)
// ============================================================

interface SparklineChartProps {
  data: number[];
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | string;
  showArea?: boolean;
  showPoints?: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  animate?: boolean;
}

const colorMap = {
  primary: '#00d4aa',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export function SparklineChart({
  data,
  color = 'primary',
  showArea = true,
  showPoints = false,
  width = 200,
  height = 48,
  strokeWidth = 2,
  className,
  animate = true,
}: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uplotRef = useRef<uPlot | null>(null);
  const prevDataRef = useRef<number[]>([]);

  const strokeColor =
    typeof color === 'string' && color in colorMap
      ? colorMap[color as keyof typeof colorMap]
      : color;

  // Simple hex to rgba for area
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const fillColor = strokeColor.startsWith('#')
    ? hexToRgba(strokeColor, 0.15)
    : strokeColor.replace(')', ', 0.15)').replace('rgb', 'rgba');

  const opts = useMemo(
    () => ({
      width,
      height,
      pixelRatio: window.devicePixelRatio || 1,
      hooks: {
        draw: [
          (_u: uPlot) => {
            // Custom draw if needed
          },
        ],
      },
      series: [
        {},
        {
          label: 'Value',
          stroke: strokeColor,
          width: strokeWidth,
          fill: showArea ? fillColor : 'transparent',
          points: {
            show: showPoints,
            size: 3,
            stroke: strokeColor,
            fill: '#0a0f1a',
            width: 2,
          },
          paths: ((
            uPlot as unknown as { paths?: { spline?: () => uPlot.Series.PathBuilder } }
          ).paths?.spline?.() ?? null) as unknown as uPlot.Series.PathBuilder | null,
        },
      ],
      axes: [
        { show: false }, // x
        { show: false }, // y
      ],
      scales: {
        x: { time: false },
        y: {
          range: (u: uPlot) => {
            const series = u.data[1] as unknown as number[];
            const min = Math.min(...series.filter((v: number) => v != null));
            const max = Math.max(...series.filter((v: number) => v != null));
            const padding = (max - min) * 0.1 || 1;
            return [min - padding, max + padding] as [number, number];
          },
        },
      },
      canvas: {
        width,
        height,
      },
      cursor: {
        show: false,
      },
      legend: {
        show: false,
      },
    }),
    [width, height, strokeColor, fillColor, showArea, showPoints, strokeWidth]
  );

  // Initialize uPlot
  useEffect(() => {
    if (!canvasRef.current || data.length < 2) return;

    // Prepare data: [x values, y values]
    const xData = data.map((_, i) => i);
    const seriesData = [xData, data];

    uplotRef.current = new uPlot(
      opts as uPlot.Options,
      seriesData as uPlot.AlignedData,
      canvasRef.current
    );

    return () => {
      uplotRef.current?.destroy();
      uplotRef.current = null;
    };
  }, []); // Only run once on mount

  // Update data
  useEffect(() => {
    if (!uplotRef.current || data.length < 2) return;

    const xData = data.map((_, i) => i);
    const seriesData = [xData, data] as uPlot.AlignedData;

    if (animate && prevDataRef.current.length === data.length) {
      // Animate transition
      uplotRef.current.setData(seriesData);
    } else {
      // Hard update
      uplotRef.current.setData(seriesData);
    }

    prevDataRef.current = data;
  }, [data, animate, opts]);

  // Handle resize
  useEffect(() => {
    if (!uplotRef.current || !canvasRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        uplotRef.current?.setSize({ width: newWidth, height: newHeight });
      }
    });

    resizeObserver.observe(canvasRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
      />
    </div>
  );
}

// ============================================================
// Mini Sparkline (CSS-only fallback for simple cases)
// ============================================================

interface MiniSparklineProps {
  data: number[];
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  height?: number;
  className?: string;
}

export function MiniSparkline({
  data,
  color = 'primary',
  height = 24,
  className,
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const colorClass = {
    primary: 'stroke-primary',
    success: 'stroke-success',
    warning: 'stroke-warning',
    danger: 'stroke-danger',
    info: 'stroke-info',
  }[color];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate path
  const pathData = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
    })
    .join(' ');

  return (
    <svg
      className={cn('w-full h-full', className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ height }}
    >
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={color === 'primary' ? '#00d4aa' : color} stopOpacity="0" />
          <stop
            offset="100%"
            stopColor={color === 'primary' ? '#00d4aa' : color}
            stopOpacity="0.15"
          />
        </linearGradient>
      </defs>

      {/* Area */}
      <path
        d={`${pathData} V 100 H 0 Z`}
        fill="url(#sparkline-gradient-primary)"
        className={colorClass}
      />

      {/* Line */}
      <path
        d={pathData}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(colorClass, 'stroke-opacity-80')}
      />

      {/* Last point */}
      {data.length > 0 && (
        <circle
          cx={`${((data.length - 1) / (data.length - 1)) * 100}%`}
          cy={`${100 - ((data[data.length - 1] - min) / range) * 100}%`}
          r="2"
          fill="currentColor"
          className={colorClass}
        />
      )}
    </svg>
  );
}

// ============================================================
// Trend Indicator
// ============================================================

interface TrendIndicatorProps {
  value: number;
  previousValue: number;
  format?: (v: number) => string;
  showIcon?: boolean;
  className?: string;
}

export function TrendIndicator({
  value,
  previousValue,
  format,
  showIcon = true,
  className,
}: TrendIndicatorProps) {
  if (previousValue === 0) return null;

  const change = ((value - previousValue) / Math.abs(previousValue)) * 100;
  const trend = change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable';
  const formattedChange = format ? format(change) : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;

  return (
    <span
      className={cn('inline-flex items-center gap-1 font-data text-data-sm font-medium', className)}
    >
      {showIcon && (
        <svg
          className={cn('w-4 h-4', trendColors[trend])}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={trendIcons[trend]}
          />
        </svg>
      )}
      <span className={cn('font-medium', trendColors[trend])}>{formattedChange}</span>
    </span>
  );
}

const trendColors = {
  up: 'text-success',
  down: 'text-danger',
  stable: 'text-fg-muted',
};

const trendIcons = {
  up: 'M5 10l7-7m0 0l7 7m-7-7v18',
  down: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  stable: 'M5 12h14',
};

// ============================================================
// KPI Card with Sparkline
// ============================================================

interface KPICardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: TrendIndicatorProps;
  sparkline?: number[];
  sparklineColor?: SparklineChartProps['color'];
  threshold?: { warn: number; critical: number };
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  unit,
  trend,
  sparkline,
  sparklineColor = 'primary',
  threshold,
  icon,
  color = 'primary',
  className,
  onClick,
}: KPICardProps) {
  const isNumeric = typeof value === 'number';
  const displayValue = isNumeric ? formatNumber(value) : String(value);

  let statusClass = '';
  if (isNumeric && threshold) {
    if (value >= threshold.critical) statusClass = 'border-danger/50 bg-danger/5';
    else if (value >= threshold.warn) statusClass = 'border-warning/50 bg-warning/5';
    else statusClass = 'border-success/50 bg-success/5';
  }

  return (
    <article
      className={cn(
        'glass-card rounded-xl p-5 transition-all duration-200',
        'hover:border-[var(--color-primary-300)] hover:border-border-strong',
        statusClass,
        className
      )}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `View ${label} details` : undefined}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon && <span className={cn('text-lg shrink-0', colorClasses[color])}>{icon}</span>}
            <p className="font-ui font-medium text-body-sm text-fg truncate">{label}</p>
          </div>

          {trend && (
            <TrendIndicator
              value={trend.value}
              previousValue={trend.previousValue}
              format={trend.format}
            />
          )}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'font-data font-bold',
              isNumeric ? 'text-data-lg' : 'text-data',
              colorClasses[color]
            )}
          >
            {displayValue}
          </span>
          {unit && <span className="font-ui text-fg-muted text-sm">{unit}</span>}
        </div>

        {/* Sparkline */}
        {sparkline && sparkline.length > 1 && (
          <div className="h-10 w-full mt-1">
            <SparklineChart data={sparkline} color={sparklineColor} showArea={true} height={32} />
          </div>
        )}
      </div>
    </article>
  );
}

const colorClasses = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};
