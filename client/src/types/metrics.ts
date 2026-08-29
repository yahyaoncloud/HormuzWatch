// ==============================================================================
// Canonical Metric & Ingestion Aggregates Types
// ==============================================================================

export type MetricKey =
  | 'totalTracks'
  | 'maritimeCount'
  | 'aviationCount'
  | 'criticalCount'
  | 'highCount'
  | 'mediumCount'
  | 'lowCount'
  | 'avgScore'
  | 'activeRegions';

export interface PublicMetricsState {
  totalTracks: number;
  maritimeCount: number;
  aviationCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgScore: number;
  activeRegions: number;
  timestamp: string;
  queueDepth?: number;
  queueDropped?: number;
}

export interface MetricCardConfig {
  key: MetricKey;
  label: string;
  value: number | string;
  change?: number;
  changePeriod?: string;
  sparkline?: number[];
  status?: 'normal' | 'warn' | 'critical';
  unit?: string;
  description?: string;
}
