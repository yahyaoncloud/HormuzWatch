/**
 * Scalable Tactical Cluster Markers (9 Types)
 * High-performance map markers for contact aggregation.
 * Glassmorphic dark backdrop, crisp high-contrast border, mono typography.
 */

import type { ClusterOptions } from '../types';

export function makeClusterMarker(opts: ClusterOptions): string {
  const count = opts.count;
  const size = opts.size ?? (count > 500 ? 44 : count > 100 ? 38 : count > 50 ? 34 : 30);

  let bg = 'rgba(138,103,57,0.88)';
  let border = 'rgba(245,158,11,0.7)';

  if (count >= 1000) {
    bg = 'rgba(185,28,28,0.90)';
    border = 'rgba(239,68,68,0.8)';
  } else if (count >= 500) {
    bg = 'rgba(180,83,9,0.90)';
    border = 'rgba(249,115,22,0.8)';
  } else if (count >= 100) {
    bg = 'rgba(180,83,9,0.85)';
    border = 'rgba(245,158,11,0.7)';
  } else if (count >= 50) {
    bg = 'rgba(138,103,57,0.88)';
    border = 'rgba(234,179,8,0.7)';
  }

  if (opts.color) {
    border = opts.color;
  }

  const label = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`;

  return `<div style="
    background: ${bg};
    border: 2px solid ${border};
    border-radius: 50%;
    width: ${size}px;
    height: ${size}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${size > 36 ? 12 : 11}px;
    font-weight: 700;
    color: #ffffff;
    font-family: 'JetBrains Mono', monospace;
    backdrop-filter: blur(8px);
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    user-select: none;
  ">${label}</div>`;
}

export function clusterTenPlus(): string {
  return makeClusterMarker({ count: 10 });
}

export function clusterFiftyPlus(): string {
  return makeClusterMarker({ count: 50 });
}

export function clusterOneHundredPlus(): string {
  return makeClusterMarker({ count: 100 });
}

export function clusterFiveHundredPlus(): string {
  return makeClusterMarker({ count: 500 });
}

export function clusterOneThousandPlus(): string {
  return makeClusterMarker({ count: 1000 });
}

export function clusterDensity(densityScore: number): string {
  const color = densityScore > 0.8 ? '#ef4444' : densityScore > 0.5 ? '#f97316' : '#38bdf8';
  return makeClusterMarker({ count: Math.round(densityScore * 100), color });
}

export function clusterMixedAircraft(count: number): string {
  return makeClusterMarker({ count, color: 'var(--contact-aircraft, #38bdf8)' });
}

export function clusterMixedMaritime(count: number): string {
  return makeClusterMarker({ count, color: 'var(--contact-vessel, #a78bfa)' });
}

export function clusterMixedTactical(count: number): string {
  return makeClusterMarker({ count, color: 'var(--severity-critical, #ef4444)' });
}
