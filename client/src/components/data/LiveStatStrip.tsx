import React from 'react';
import type { PublicMetricsResponse } from '@/lib/api';
import { MetricCard } from '@/components/molecules/MetricCard';

export type MetricKey = 'vessels' | 'aircraft' | 'regions' | 'risk';

export const METRIC_META: Record<
  MetricKey,
  { label: string; suffix: string; accent: string; description: string }
> = {
  vessels: {
    label: 'Vessels tracked',
    suffix: '',
    accent: 'var(--color-info)',
    description:
      'Live count of maritime vessels currently transmitting within the Persian Gulf, Strait of Hormuz, and Gulf of Oman watch areas. Updated continuously from AIS feeds.',
  },
  aircraft: {
    label: 'Aircraft tracked',
    suffix: '',
    accent: 'var(--color-warning)',
    description:
      'Live count of aircraft currently tracked across the monitored airspace via ADS-B, including both civil and state aircraft operating near the strait.',
  },
  regions: {
    label: 'Active regions',
    suffix: '',
    accent: 'var(--color-primary-600)',
    description:
      'Number of watch zones currently exhibiting elevated activity or risk. Regions escalate as traffic density, proximity to restricted zones, or anomaly scores rise.',
  },
  risk: {
    label: 'Maritime risk index',
    suffix: '/100',
    accent: 'var(--color-danger)',
    description:
      'Composite 0–100 anomaly score across monitored maritime traffic. Higher values indicate greater deviation from established behavioral baselines and warrant closer attention.',
  },
};

export const LiveStatStrip: React.FC<{
  metrics: PublicMetricsResponse['metrics'] | undefined;
  isLoading: boolean;
  onMetricClick: (key: MetricKey) => void;
}> = ({ metrics, isLoading, onMetricClick }) => {
  const stats: Array<{ key: MetricKey; label: string; value: number | null | undefined; suffix: string; accent: string }> = [
    {
      key: 'vessels',
      label: METRIC_META.vessels.label,
      value: metrics?.maritimeCount,
      suffix: METRIC_META.vessels.suffix,
      accent: METRIC_META.vessels.accent,
    },
    {
      key: 'aircraft',
      label: METRIC_META.aircraft.label,
      value: metrics?.aviationCount,
      suffix: METRIC_META.aircraft.suffix,
      accent: METRIC_META.aircraft.accent,
    },
    {
      key: 'regions',
      label: METRIC_META.regions.label,
      value: metrics?.activeRegions,
      suffix: METRIC_META.regions.suffix,
      accent: METRIC_META.regions.accent,
    },
    {
      key: 'risk',
      label: METRIC_META.risk.label,
      value: metrics?.avgScore,
      suffix: METRIC_META.risk.suffix,
      accent: METRIC_META.risk.accent,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-none border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
      {stats.map((s) => (
        <MetricCard
          key={s.key}
          label={s.label}
          value={s.value}
          suffix={s.suffix}
          accentColor={s.accent}
          isLoading={isLoading}
          onClick={() => onMetricClick(s.key)}
        />
      ))}
    </dl>
  );
};
