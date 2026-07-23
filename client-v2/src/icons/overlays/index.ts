/**
 * Tactical Status Overlays (35 Types)
 * Overlays render around or over existing symbols (not standalone).
 * Designed for composability in Leaflet or MapLibre SVG overlays.
 * ViewBox 36x36 (larger than 24x24 contact symbol to encompass it).
 */

import type { OverlayOptions } from '../types';

function wrapOverlay(content: string, options: OverlayOptions = {}): string {
  const size = options.size ?? 36;
  const strokeW = options.strokeWidth ?? 1.5;
  const cls = options.className ? ` class="${options.className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"${cls}>
  <g stroke-linecap="round" stroke-linejoin="round" stroke-width="${strokeW}">
    ${content}
  </g>
</svg>`;
}

// Selection & Target States
export function overlaySelected(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-selected, #f59e0b)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="2" stroke-dasharray="4 2"/>
    <path d="M18 1V5M18 31V35M1 18H5M31 18H35" stroke="${color}" stroke-width="2"/>
  `, opts);
}

export function overlayFocused(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-focused, #38bdf8)';
  return wrapOverlay(`
    <path d="M6 12V6H12M24 6H30V12M30 24V30H24M12 30H6V24" stroke="${color}" stroke-width="2"/>
  `, opts);
}

export function overlayHovered(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-hovered, #e2e8f0)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="16" stroke="${color}" stroke-width="1" opacity="0.6"/>
  `, opts);
}

// Tactical Affiliation Frames (NATO APP-6 style boundary corners)
export function overlayFriend(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--affil-friend, #38bdf8)';
  return wrapOverlay(`<rect x="4" y="4" width="28" height="28" rx="2" stroke="${color}" stroke-width="1.8" fill="${color}" fill-opacity="0.08"/>`, opts);
}

export function overlayHostile(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--affil-hostile, #ef4444)';
  return wrapOverlay(`<polygon points="18,3 33,18 18,33 3,18" stroke="${color}" stroke-width="1.8" fill="${color}" fill-opacity="0.08"/>`, opts);
}

export function overlayNeutral(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--affil-neutral, #4ade80)';
  return wrapOverlay(`<rect x="5" y="5" width="26" height="26" stroke="${color}" stroke-width="1.8" fill="${color}" fill-opacity="0.08"/>`, opts);
}

export function overlayUnknown(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--affil-unknown, #facc15)';
  return wrapOverlay(`<path d="M18 3 C27 3 33 9 33 18 C33 27 27 33 18 33 C9 33 3 27 3 18 C3 9 9 3 18 3 Z" stroke="${color}" stroke-width="1.8" stroke-dasharray="3 2" fill="${color}" fill-opacity="0.08"/>`, opts);
}

// Emergency & Hazard Overlays
export function overlayEmergency(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-emergency, #ef4444)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="16" stroke="${color}" stroke-width="2.5" class="tact-anim-pulse"/>
    <circle cx="18" cy="18" r="12" stroke="${color}" stroke-width="1" stroke-dasharray="3 3"/>
  `, opts);
}

export function overlaySos(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-sos, #fbbf24)';
  return wrapOverlay(`
    <polygon points="18,2 34,32 2,32" stroke="${color}" stroke-width="2" fill="${color}" fill-opacity="0.15" class="tact-anim-blink"/>
    <text x="18" y="27" font-size="9" font-weight="900" text-anchor="middle" fill="${color}" stroke="none">SOS</text>
  `, opts);
}

export function overlayDistress(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-critical, #ef4444)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="2"/>
    <path d="M10 10L26 26M26 10L10 26" stroke="${color}" stroke-width="2.5"/>
  `, opts);
}

// Signal & Sensor Loss Overlays
export function overlayAisLost(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-lost, #6b7280)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="14" stroke="${color}" stroke-width="1.5" stroke-dasharray="2 2"/>
    <line x1="6" y1="6" x2="30" y2="30" stroke="${color}" stroke-width="2"/>
    <text x="18" y="22" font-size="7" font-weight="700" text-anchor="middle" fill="${color}" stroke="none">AIS</text>
  `, opts);
}

export function overlayAdsbLost(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-lost, #6b7280)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="14" stroke="${color}" stroke-width="1.5" stroke-dasharray="2 2"/>
    <line x1="6" y1="6" x2="30" y2="30" stroke="${color}" stroke-width="2"/>
    <text x="18" y="22" font-size="6" font-weight="700" text-anchor="middle" fill="${color}" stroke="none">ADS-B</text>
  `, opts);
}

export function overlayGpsLost(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-lost, #6b7280)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="13" stroke="${color}" stroke-width="1.5"/>
    <path d="M5 5L31 31" stroke="${color}" stroke-width="2"/>
  `, opts);
}

export function overlayCommLost(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-lost, #6b7280)';
  return wrapOverlay(`
    <path d="M12 24C12 24 14 20 18 20C22 20 24 24 24 24M9 20C9 20 12 16 18 16C24 16 27 20 27 20" stroke="${color}"/>
    <line x1="6" y1="6" x2="30" y2="30" stroke="${color}" stroke-width="2"/>
  `, opts);
}

export function overlayOffline(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-lost, #6b7280)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="1.5" opacity="0.4"/>
    <circle cx="18" cy="18" r="4" fill="${color}"/>
  `, opts);
}

// Electronic Warfare & Threat Overlays
export function overlaySignalJammed(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-jammed, #7c3aed)';
  return wrapOverlay(`
    <path d="M4 18Q9 10 18 18T32 18" stroke="${color}" stroke-width="2" class="tact-anim-pulse"/>
    <path d="M4 14Q9 22 18 14T32 14" stroke="${color}" stroke-width="1.5"/>
  `, opts);
}

export function overlayEw(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-jammed, #7c3aed)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 3" class="tact-anim-rotate"/>
    <polygon points="18,6 22,18 18,14 14,18" fill="${color}"/>
  `, opts);
}

export function overlayRadarLock(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-critical, #ef4444)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="14" stroke="${color}" stroke-width="2"/>
    <circle cx="18" cy="18" r="8" stroke="${color}" stroke-width="1"/>
    <circle cx="18" cy="18" r="2" fill="${color}"/>
    <line x1="18" y1="0" x2="18" y2="36" stroke="${color}" stroke-width="1"/>
    <line x1="0" y1="18" x2="36" y2="18" stroke="${color}" stroke-width="1"/>
  `, opts);
}

export function overlayMissileWarning(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-critical, #ef4444)';
  return wrapOverlay(`
    <polygon points="18,2 34,32 2,32" stroke="${color}" stroke-width="2.5" fill="${color}" fill-opacity="0.2" class="tact-anim-pulse"/>
    <line x1="18" y1="10" x2="18" y2="22" stroke="${color}" stroke-width="3"/>
    <circle cx="18" cy="27" r="1.5" fill="${color}"/>
  `, opts);
}

export function overlayIntercept(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-high, #f97316)';
  return wrapOverlay(`
    <line x1="4" y1="32" x2="32" y2="4" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>
    <polygon points="32,4 24,6 30,12" fill="${color}"/>
  `, opts);
}

// Tactical Formation Overlays
export function overlayFormationLeader(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--affil-friend, #38bdf8)';
  return wrapOverlay(`
    <polygon points="18,2 24,10 18,8 12,10" fill="${color}"/>
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="1.5"/>
  `, opts);
}

export function overlayFormationMember(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--affil-friend, #38bdf8)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="1" stroke-dasharray="2 2"/>
  `, opts);
}

// Anomaly & Security Overlays
export function overlayAnomaly(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-anomaly, #ec4899)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="2" stroke-dasharray="4 2"/>
    <path d="M18 10V20M18 24V25" stroke="${color}" stroke-width="2.5"/>
  `, opts);
}

export function overlaySuspicious(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-medium, #facc15)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="14" stroke="${color}" stroke-width="2"/>
    <text x="18" y="24" font-size="16" font-weight="900" text-anchor="middle" fill="${color}" stroke="none">?</text>
  `, opts);
}

export function overlayBoarded(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-piracy, #dc2626)';
  return wrapOverlay(`
    <rect x="5" y="5" width="26" height="26" stroke="${color}" stroke-width="2"/>
    <line x1="5" y1="5" x2="31" y2="31" stroke="${color}" stroke-width="2"/>
  `, opts);
}

export function overlayPiracy(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-piracy, #dc2626)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="2" fill="${color}" fill-opacity="0.15"/>
    <path d="M12 12L24 24M24 12L12 24" stroke="${color}" stroke-width="2.5"/>
  `, opts);
}

export function overlayHijack(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-critical, #ef4444)';
  return wrapOverlay(`
    <polygon points="18,2 34,32 2,32" stroke="${color}" stroke-width="2.5" fill="${color}" fill-opacity="0.25"/>
    <text x="18" y="26" font-size="11" font-weight="900" text-anchor="middle" fill="${color}" stroke="none">HIJACK</text>
  `, opts);
}

export function overlayFire(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-high, #f97316)';
  return wrapOverlay(`
    <path d="M18 4C18 4 23 11 23 17C23 21 20.8 24 18 24C15.2 24 13 21 13 17C13 13 18 4 18 4Z" fill="${color}" fill-opacity="0.7" stroke="${color}"/>
  `, opts);
}

export function overlayCollisionRisk(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-high, #f97316)';
  return wrapOverlay(`
    <circle cx="12" cy="18" r="9" stroke="${color}" stroke-width="2"/>
    <circle cx="24" cy="18" r="9" stroke="${color}" stroke-width="2"/>
  `, opts);
}

// Operational Status Overlays
export function overlayGrounded(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--overlay-lost, #6b7280)';
  return wrapOverlay(`
    <line x1="6" y1="26" x2="30" y2="26" stroke="${color}" stroke-width="3"/>
  `, opts);
}

export function overlayAnchored(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--contact-vessel, #a78bfa)';
  return wrapOverlay(`
    <circle cx="18" cy="18" r="15" stroke="${color}" stroke-width="1.5"/>
    <circle cx="18" cy="11" r="2" stroke="${color}"/>
    <line x1="18" y1="13" x2="18" y2="24" stroke="${color}" stroke-width="2"/>
    <path d="M12 20C12 22 14 24 18 24C22 24 24 22 24 20" stroke="${color}" stroke-width="2"/>
  `, opts);
}

export function overlayMoored(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--contact-vessel, #a78bfa)';
  return wrapOverlay(`
    <rect x="6" y="6" width="24" height="24" rx="2" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 2"/>
  `, opts);
}

export function overlayNotUnderCommand(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-critical, #ef4444)';
  return wrapOverlay(`
    <circle cx="18" cy="10" r="3" fill="${color}"/>
    <circle cx="18" cy="26" r="3" fill="${color}"/>
  `, opts);
}

export function overlayRestrictedManoeuvrability(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-medium, #facc15)';
  return wrapOverlay(`
    <circle cx="18" cy="8" r="2.5" fill="${color}"/>
    <polygon points="18,14 22,20 14,20" fill="${color}"/>
    <circle cx="18" cy="26" r="2.5" fill="${color}"/>
  `, opts);
}

export function overlayDrifting(opts?: OverlayOptions): string {
  const color = opts?.color ?? 'var(--severity-medium, #facc15)';
  return wrapOverlay(`
    <path d="M4 18 Q 11 12, 18 18 T 32 18" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>
  `, opts);
}
