// ==============================================================================
// Canonical Telemetry & Tracking Types (AIS Maritime, ADS-B Air, ML Anomaly)
// ==============================================================================

export type AssetDomain = 'maritime' | 'aviation' | 'land' | 'sensor';
export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface BaseTrack {
  trackId: string;
  assetName: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  score: number;
  severity: AnomalySeverity | string;
  reasons?: string | string[];
  updatedAt?: string;
  altitude?: number;
  squawk?: string;
}

export interface VesselTrack extends BaseTrack {
  domain: 'maritime';
  mmsi?: string;
  imo?: string;
  vesselType?: string;
  destination?: string;
  draft?: number;
  flag?: string;
}

export interface AircraftTrack extends BaseTrack {
  domain: 'aviation';
  callsign?: string;
  icao?: string;
  altitude?: number;
  squawk?: string;
  onGround?: boolean;
}

export interface AnomalyEvaluation {
  trackId: string;
  score: number;
  severity: AnomalySeverity;
  reasons: string[];
  evaluatedAt: string;
  ensembleModelCount?: number;
  isolationForestScore?: number;
  dbscanScore?: number;
  kdeScore?: number;
  classifierScore?: number;
}

export interface StrategicWatchZone {
  id: string;
  name: string;
  label: string;
  category: 'chokepoint' | 'terminal' | 'anchorage' | 'basin';
  coords: [number, number][];
  color: string;
}
