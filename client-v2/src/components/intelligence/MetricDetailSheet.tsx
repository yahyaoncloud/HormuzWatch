import {
  LiveAviationMetrics,
  LiveMaritimeMetrics,
  LivePlatformMetrics,
} from '@/components/data/MetricGrid';
import { METRIC_META, type MetricKey } from '@/components/data/LiveStatStrip';
import { BottomSheet } from '@/components/ui/sheet';
import type { PublicMetricsResponse } from '@/lib/api';
import { formatCompact } from '@/utils/cn';

interface MetricDetailSheetProps {
  selectedMetric: MetricKey | null;
  onClose: () => void;
  metrics: PublicMetricsResponse['metrics'] | undefined;
}

export function MetricDetailSheet({ selectedMetric, onClose, metrics }: MetricDetailSheetProps) {
  const selectedMeta = selectedMetric ? METRIC_META[selectedMetric] : null;
  const metricValues: Record<MetricKey, number | null> = metrics
    ? {
        vessels: metrics.maritimeCount,
        aircraft: metrics.aviationCount,
        regions: metrics.activeRegions,
        risk: metrics.avgScore,
      }
    : { vessels: null, aircraft: null, regions: null, risk: null };
  const selectedValue = selectedMetric ? metricValues[selectedMetric] : null;

  return (
    <BottomSheet
      open={selectedMetric !== null}
      onClose={onClose}
      title={selectedMeta?.label}
      description="Live situational metric"
    >
      {selectedMeta && (
        <div className="space-y-6">
          <div className="flex items-end gap-2">
            <span
              className="mb-1.5 h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedMeta.accent }}
              aria-hidden="true"
            />
            <span className="font-data text-5xl font-semibold text-[var(--color-fg)]">
              {selectedValue === null || selectedValue === undefined
                ? '—'
                : formatCompact(Number(selectedValue))}
            </span>
            {selectedMeta.suffix && (
              <span className="pb-1 font-ui text-lg text-[var(--color-fg-muted)]">
                {selectedMeta.suffix}
              </span>
            )}
          </div>
          <p className="font-ui text-sm leading-relaxed text-[var(--color-fg-muted)]">
            {selectedMeta.description}
          </p>

          {/* Detailed Metrics Showcase */}
          {metrics && (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4 space-y-6">
              {selectedMetric === 'risk' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                      Threat Severity Breakdown
                    </h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 border border-[var(--color-border)]">
                        <div className="text-xs text-[var(--color-fg-muted)] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />{' '}
                          Critical
                        </div>
                        <div className="mt-1 font-data text-lg font-semibold text-[var(--color-fg)]">
                          {metrics.criticalCount}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 border border-[var(--color-border)]">
                        <div className="text-xs text-[var(--color-fg-muted)] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" /> High
                        </div>
                        <div className="mt-1 font-data text-lg font-semibold text-[var(--color-fg)]">
                          {metrics.highCount}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 border border-[var(--color-border)]">
                        <div className="text-xs text-[var(--color-fg-muted)] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-info)]" /> Medium
                        </div>
                        <div className="mt-1 font-data text-lg font-semibold text-[var(--color-fg)]">
                          {metrics.mediumCount}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 border border-[var(--color-border)]">
                        <div className="text-xs text-[var(--color-fg-muted)] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" /> Low
                        </div>
                        <div className="mt-1 font-data text-lg font-semibold text-[var(--color-fg)]">
                          {metrics.lowCount}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-[var(--color-border)]/50">
                    <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                      Platform Health & Telemetry Metrics
                    </h4>
                    <LivePlatformMetrics columns={2} />
                  </div>
                </div>
              )}

              {selectedMetric === 'vessels' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                      Platform Distribution
                    </h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-fg-muted)]">Maritime Vessels</span>
                        <span className="font-data font-semibold text-[var(--color-fg)]">
                          {metrics.maritimeCount}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-info)] rounded-full transition-all duration-500"
                          style={{
                            width: `${(metrics.maritimeCount / metrics.totalTracks) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-[var(--color-fg-muted)]">Aviation Assets</span>
                        <span className="font-data font-semibold text-[var(--color-fg)]">
                          {metrics.aviationCount}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-warning)] rounded-full transition-all duration-500"
                          style={{
                            width: `${(metrics.aviationCount / metrics.totalTracks) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-sm">
                        <span className="text-[var(--color-fg-muted)]">
                          Total Combined Tracks
                        </span>
                        <span className="font-data font-semibold text-[var(--color-fg)]">
                          {metrics.totalTracks}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-[var(--color-border)]/50">
                    <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                      Maritime Domain Metrics
                    </h4>
                    <LiveMaritimeMetrics columns={2} />
                  </div>
                </div>
              )}

              {selectedMetric === 'aircraft' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                      Platform Distribution
                    </h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-fg-muted)]">Maritime Vessels</span>
                        <span className="font-data font-semibold text-[var(--color-fg)]">
                          {metrics.maritimeCount}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-info)] rounded-full transition-all duration-500"
                          style={{
                            width: `${(metrics.maritimeCount / metrics.totalTracks) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-[var(--color-fg-muted)]">Aviation Assets</span>
                        <span className="font-data font-semibold text-[var(--color-fg)]">
                          {metrics.aviationCount}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-warning)] rounded-full transition-all duration-500"
                          style={{
                            width: `${(metrics.aviationCount / metrics.totalTracks) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-sm">
                        <span className="text-[var(--color-fg-muted)]">
                          Total Combined Tracks
                        </span>
                        <span className="font-data font-semibold text-[var(--color-fg)]">
                          {metrics.totalTracks}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-[var(--color-border)]/50">
                    <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                      Aviation Domain Metrics
                    </h4>
                    <LiveAviationMetrics columns={2} />
                  </div>
                </div>
              )}

              {selectedMetric === 'regions' && (
                <div className="space-y-3">
                  <h4 className="font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    Monitored Watch Zones
                  </h4>
                  <ul className="space-y-2 text-sm text-[var(--color-fg-muted)]">
                    <li className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                        Strait of Hormuz
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#b87333]" />
                        Persian Gulf (N)
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-[#b87333] bg-[#b87333]/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                        Gulf of Oman
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-[#38bdf8] bg-[#38bdf8]/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
