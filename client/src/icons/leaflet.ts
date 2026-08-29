/**
 * HormuzWatch Tactical Icon System — Leaflet DivIcon Factory
 * ==========================================================
 * Production-ready factory that transforms any icon from the registry into
 * a high-performance Leaflet DivIcon with heading rotation, severity color,
 * selection glow, and status overlays.
 */

import L from 'leaflet';
import { TACTICAL_ICON_REGISTRY } from './registry';
import { overlaySelected, overlayEmergency } from './overlays';

export interface LeafletIconOptions {
  /** Icon registry ID or fall back to generic classifier */
  iconId?: string;
  /** Contact category fallback if iconId isn't provided */
  category?: 'aircraft' | 'maritime' | 'infrastructure';
  /** Severity level for CSS color mapping */
  severity?: 'normal' | 'info' | 'low' | 'medium' | 'elevated' | 'high' | 'critical' | 'emergency';
  /** Heading / course in degrees (0..360) for rotation */
  heading?: number;
  /** Is contact selected on map */
  selected?: boolean;
  /** Base icon size in pixels (default: 28px, 36px if selected) */
  size?: number;
  /** Custom overlay SVG string */
  overlayId?: string;
}

/**
 * Returns severity CSS variable string for inline SVG coloring
 */

export function getSeverityCssColor(severity?: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'var(--severity-critical, #ef4444)';
    case 'emergency':
      return 'var(--severity-emergency, #fca5a5)';
    case 'high':
      return 'var(--severity-high, #f97316)';
    case 'elevated':
      return 'var(--severity-elevated, #fb923c)';
    case 'medium':
      return 'var(--severity-medium, #facc15)';
    case 'low':
      return 'var(--severity-low, #4ade80)';
    case 'info':
      return 'var(--severity-info, #818cf8)';
    default:
      return 'var(--severity-normal, #38bdf8)';
  }
}

/**
 * Primary Leaflet DivIcon builder used across maps
 */
export function createTacticalLeafletIcon(opts: LeafletIconOptions): L.DivIcon {
  const selected = opts.selected ?? false;
  const size = opts.size ?? (selected ? 36 : 28);
  const half = size / 2;
  const heading = opts.heading ?? 0;
  const severityColor = getSeverityCssColor(opts.severity);

  // Look up renderer from registry or fallback
  let iconMeta = opts.iconId ? TACTICAL_ICON_REGISTRY[opts.iconId] : undefined;

  if (!iconMeta) {
    // Fallback classification
    const fallbackId = opts.category === 'aircraft' ? 'aircraft-commercial' : 'vessel-cargo';
    iconMeta = TACTICAL_ICON_REGISTRY[fallbackId];
  }

  const isRotating = iconMeta?.rotatable ?? true;
  const strokeW = selected ? 2.2 : 1.5;
  const innerSvg = iconMeta ? iconMeta.render({ size: size - 4, color: severityColor, strokeWidth: strokeW }) : '';

  // Optional status overlay frame
  let overlayHtml = '';
  if (selected) {
    overlayHtml = overlaySelected({ size, color: 'var(--overlay-selected, #f59e0b)' });
  } else if (opts.severity === 'critical' || opts.severity === 'emergency') {
    overlayHtml = overlayEmergency({ size, color: severityColor });
  }

  const rotationTransform = isRotating ? `rotate(${heading}deg)` : 'none';
  const glow = selected ? 'filter: drop-shadow(0 0 6px var(--overlay-selected, #f59e0b));' : '';

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: ${rotationTransform};
      transform-origin: center center;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ${glow}
    ">
      ${innerSvg}
      ${overlayHtml ? `<div style="position: absolute; inset: 0; pointer-events: none;">${overlayHtml}</div>` : ''}
    </div>`;

  return L.divIcon({
    html,
    className: 'tact-icon',
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}
