// ==============================================================================
// Canonical Threat & Incident Feed Types
// ==============================================================================

export interface ThreatItem {
  id: string;
  trackId: string;
  assetName: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  region: string;
  time: string;
  score: number;
  anomalyScore?: number;
  reasons?: string[];
  timestamp?: string;
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
  severity: 'critical' | 'high' | 'medium' | 'low';
}
