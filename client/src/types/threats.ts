// ==============================================================================
// Canonical Threat & Incident Feed Types
// ==============================================================================

import type { AnomalySeverity } from './telemetry';

export interface ThreatItem {
  id: string;
  trackId: string;
  assetName: string;
  anomalyScore: number;
  severity: AnomalySeverity | string;
  reasons: string[];
  timestamp: string;
  lat?: number;
  lon?: number;
  speed?: number;
  heading?: number;
  domain?: 'maritime' | 'aviation';
}

export interface ThreatCluster {
  id: string;
  name: string;
  centerLat: number;
  centerLon: number;
  threatCount: number;
  maxScore: number;
  severity: AnomalySeverity;
}
