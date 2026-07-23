import type { PublicMetricsResponse } from '@/lib/api';
import { formatCompact } from '@/utils/cn';

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

export function LiveStatStrip({
  metrics,
  isLoading,
  onMetricClick,
}: {
  metrics: PublicMetricsResponse['metrics'] | undefined;
  isLoading: boolean;
  onMetricClick: (key: MetricKey) => void;
}) {
  const stats: Array<{ key: MetricKey; label: string; value: number | null; suffix: string }> = [
    {
      key: 'vessels',
      label: 'Vessels tracked',
      value: metrics ? metrics.maritimeCount : null,
      suffix: '',
    },
    {
      key: 'aircraft',
      label: 'Aircraft tracked',
      value: metrics ? metrics.aviationCount : null,
      suffix: '',
    },
    {
      key: 'regions',
      label: 'Active regions',
      value: metrics ? metrics.activeRegions : null,
      suffix: '',
    },
    {
      key: 'risk',
      label: 'Maritime risk index',
      value: metrics ? metrics.avgScore : null,
      suffix: '/100',
    },
  ];

  if (isLoading) {
    return (
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.key} className="animate-pulse bg-[var(--color-bg-card)] p-4">
            <dt className="font-ui text-xs text-[var(--color-fg-muted)]">{s.label}</dt>
            <dd className="mt-1 h-7 w-2/3 rounded bg-[var(--color-neutral-200)]" />
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
      {stats.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onMetricClick(s.key)}
          aria-label={`${s.label} details`}
          className="group flex flex-col items-start bg-[var(--color-bg-card)] p-4 text-left transition-colors hover:bg-[var(--color-bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
        >
          <dt className="font-ui text-xs text-[var(--color-fg-muted)]">{s.label}</dt>
          <dd className="mt-1 font-data text-2xl font-semibold text-[var(--color-fg)] transition-colors group-hover:text-[var(--color-primary-700)]">
            {s.value === null ? '—' : formatCompact(Number(s.value))}
            {s.suffix && (
              <span className="ml-0.5 text-base text-[var(--color-fg-muted)]">{s.suffix}</span>
            )}
          </dd>
        </button>
      ))}
    </dl>
  );
}
