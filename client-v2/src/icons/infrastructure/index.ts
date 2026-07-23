/**
 * Static Infrastructure Pin Generators (45 Types)
 * Map locations that do not rotate.
 * Teardrop base pin shape with high-clarity category glyph inside.
 * ViewBox 24x24, SVG scalable, CSS token colorable.
 */

import type { IconOptions } from '../types';

function wrapPin(glyphSvg: string, opts: IconOptions = {}): string {
  const size = opts.size ?? 28;
  const color = opts.color ?? 'var(--contact-infra, #94a3b8)';
  const strokeW = opts.strokeWidth ?? 1.5;
  const cls = opts.className ? ` class="${opts.className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"${cls} style="color: ${color};">
  <g stroke="currentColor" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round">
    <!-- Teardrop Pin Base -->
    <path d="M12 2C7.5 2 4 5.5 4 10C4 15.25 12 22 12 22C12 22 20 15.25 20 10C20 5.5 16.5 2 12 2Z" fill="var(--icon-bg-dark, rgba(8,13,24,0.85))"/>
    <!-- Inner Category Glyph -->
    <g transform="translate(0, -1)">
      ${glyphSvg}
    </g>
  </g>
</svg>`;
}

// Airports & Airbases
export function pinCommercialAirport(opts?: IconOptions): string {
  return wrapPin(`<path d="M12 6L13 9.5L16.5 11.5V12.5L13 11.5V14.5L14 15.2V16L12 15.5L10 16V15.2L11 14.5V11.5L7.5 12.5V11.5L11 9.5L12 6Z" fill="currentColor"/>`, opts);
}

export function pinMilitaryAirbase(opts?: IconOptions): string {
  return wrapPin(`<path d="M12 6L13.5 9.5L17 12V13L13 12V15L14.5 16.2V17L12 16.5L9.5 17V16.2L11 15V12L7 13V12L10.5 9.5L12 6Z" fill="currentColor"/><circle cx="12" cy="11" r="4" stroke-dasharray="1.5 1.5"/>`, opts);
}

export function pinForwardOperatingBase(opts?: IconOptions): string {
  return wrapPin(`<path d="M8 7H16V15H8Z"/><path d="M12 7V15M8 11H16"/><polygon points="12,5 14,7 10,7" fill="currentColor"/>`, opts);
}

export function pinHeliport(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="10" r="4.5"/><path d="M9.5 7.5V12.5M14.5 7.5V12.5M9.5 10H14.5" stroke-width="1.8"/>`, opts);
}

// Ports & Maritime
export function pinCommercialPort(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="7" r="1.5"/><path d="M12 8.5V15M9 10.5H15M8 15C8 15 9.5 16.5 12 16.5C14.5 16.5 16 15 16 15"/>`, opts);
}

export function pinContainerPort(opts?: IconOptions): string {
  return wrapPin(`<rect x="7" y="7" width="4" height="7" rx="0.5"/><rect x="13" y="7" width="4" height="7" rx="0.5"/><line x1="7" y1="10.5" x2="17" y2="10.5"/>`, opts);
}

export function pinOilTerminal(opts?: IconOptions): string {
  return wrapPin(`<path d="M12 6C12 6 8.5 9.5 8.5 11.5C8.5 13.4 10.1 15 12 15C13.9 15 15.5 13.4 15.5 11.5C15.5 9.5 12 6 12 6Z" fill="currentColor" fill-opacity="0.3"/>`, opts);
}

export function pinLngTerminal(opts?: IconOptions): string {
  return wrapPin(`<circle cx="9.5" cy="11" r="2.5"/><circle cx="14.5" cy="11" r="2.5"/><path d="M7 14.5H17"/>`, opts);
}

export function pinRefinery(opts?: IconOptions): string {
  return wrapPin(`<path d="M8 6V15M12 8V15M16 6V15M8 9H16M8 12H16"/><path d="M7 15H17"/>`, opts);
}

export function pinNavalBase(opts?: IconOptions): string {
  return wrapPin(`<path d="M12 6L14 9H17V14H7V9H10L12 6Z"/><circle cx="12" cy="11.5" r="1.5" fill="currentColor"/>`, opts);
}

export function pinCoastGuardBase(opts?: IconOptions): string {
  return wrapPin(`<path d="M12 6L16 8.5V12C16 14.5 14 16 12 16.5C10 16 8 14.5 8 12V8.5L12 6Z"/><line x1="10" y1="9.5" x2="14" y2="13.5"/>`, opts);
}

export function pinDryDock(opts?: IconOptions): string {
  return wrapPin(`<path d="M7 7V14H17V7M7 14L9 16H15L17 14"/>`, opts);
}

export function pinShipyard(opts?: IconOptions): string {
  return wrapPin(`<path d="M7 15L12 6L17 15H7Z"/><line x1="10" y1="11" x2="14" y2="11"/>`, opts);
}

// Military & Defense Sites
export function pinRadarSite(opts?: IconOptions): string {
  return wrapPin(`<path d="M7 13C7 10.2 9.2 8 12 8C14.8 8 17 10.2 17 13"/><path d="M9.5 13C9.5 11.6 10.6 10.5 12 10.5"/><circle cx="12" cy="13" r="1" fill="currentColor"/>`, opts);
}

export function pinAirDefenseSite(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="10" r="4.5"/><line x1="12" y1="5.5" x2="12" y2="14.5"/><line x1="7.5" y1="10" x2="16.5" y2="10"/><circle cx="12" cy="10" r="1.5" fill="currentColor"/>`, opts);
}

export function pinMissileSite(opts?: IconOptions): string {
  return wrapPin(`<path d="M12 6L13.5 9V14H10.5V9L12 6Z" fill="currentColor"/><path d="M9.5 14L8 16H16L14.5 14"/>`, opts);
}

export function pinMilitaryHq(opts?: IconOptions): string {
  return wrapPin(`<polygon points="12,5.5 16,8.5 16,14.5 8,14.5 8,8.5"/><path d="M12 8.5L14 10.5H10L12 8.5Z" fill="currentColor"/>`, opts);
}

export function pinCommandCenter(opts?: IconOptions): string {
  return wrapPin(`<rect x="7" y="7" width="10" height="7" rx="1"/><circle cx="12" cy="10.5" r="2"/><line x1="12" y1="5.5" x2="12" y2="7"/>`, opts);
}

export function pinAmmunitionDepot(opts?: IconOptions): string {
  return wrapPin(`<path d="M10 6H14V10L15.5 12V15H8.5V12L10 10V6Z"/><line x1="10" y1="8" x2="14" y2="8"/>`, opts);
}

export function pinFuelDepot(opts?: IconOptions): string {
  return wrapPin(`<rect x="8" y="7" width="8" height="8" rx="1.5"/><path d="M10 7V5.5H14V7M8 11H16"/>`, opts);
}

// Communications & Energy
export function pinCommunicationsTower(opts?: IconOptions): string {
  return wrapPin(`<path d="M12 5V16M9 16L12 5L15 16M7 11H17M8.5 13.5H15.5"/>`, opts);
}

export function pinSatelliteStation(opts?: IconOptions): string {
  return wrapPin(`<path d="M7 13C7 9.5 9.5 7 13 7"/><line x1="7" y1="13" x2="13" y2="7" stroke-width="2"/><line x1="13" y1="7" x2="16" y2="4"/>`, opts);
}

export function pinPowerPlant(opts?: IconOptions): string {
  return wrapPin(`<path d="M13 5L8 11H12L11 16L16 10H12L13 5Z" fill="currentColor"/>`, opts);
}

export function pinPipelineStation(opts?: IconOptions): string {
  return wrapPin(`<path d="M6 10H18M6 13H18"/><rect x="10" y="8" width="4" height="7" rx="0.5" fill="currentColor" fill-opacity="0.3"/>`, opts);
}

// Logistics & Infrastructure
export function pinLogisticsHub(opts?: IconOptions): string {
  return wrapPin(`<path d="M7 8L12 5.5L17 8V13L12 15.5L7 13V8Z"/><path d="M7 8L12 10.5L17 8M12 10.5V15.5"/>`, opts);
}

export function pinWarehouse(opts?: IconOptions): string {
  return wrapPin(`<path d="M6 9L12 6L18 9V15H6V9Z"/><rect x="10" y="11" width="4" height="4"/>`, opts);
}

export function pinBridge(opts?: IconOptions): string {
  return wrapPin(`<path d="M5 13C5 10 8 10 12 10C16 10 19 10 19 13M5 8H19M5 15H19"/><line x1="8" y1="10" x2="8" y2="15"/><line x1="16" y1="10" x2="16" y2="15"/>`, opts);
}

export function pinTunnel(opts?: IconOptions): string {
  return wrapPin(`<path d="M6 14C6 9 8.5 7 12 7C15.5 7 18 9 18 14H6Z" fill="currentColor" fill-opacity="0.25"/>`, opts);
}

export function pinCanalLock(opts?: IconOptions): string {
  return wrapPin(`<path d="M6 6V15M18 6V15M6 10.5L12 8.5L18 10.5M6 12.5L12 14.5L18 12.5"/>`, opts);
}

// Security & Border
export function pinBorderCrossing(opts?: IconOptions): string {
  return wrapPin(`<line x1="6" y1="11" x2="18" y2="11" stroke-width="2.5"/><line x1="8" y1="7" x2="8" y2="15"/><line x1="16" y1="7" x2="16" y2="15"/>`, opts);
}

export function pinCheckpoint(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="10" r="4.5"/><polygon points="12,7 13.5,11.5 10.5,11.5" fill="currentColor"/>`, opts);
}

export function pinCustomsFacility(opts?: IconOptions): string {
  return wrapPin(`<rect x="7" y="7" width="10" height="7" rx="1"/><path d="M9 10.5H15M12 8.5V12.5"/>`, opts);
}

export function pinImmigrationPoint(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="8" r="2"/><path d="M8 14C8 12 9.8 11 12 11C14.2 11 16 12 16 14"/>`, opts);
}

// Emergency & Support
export function pinSearchAndRescue(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="10.5" r="4"/><path d="M12 6.5V14.5M8 10.5H16" stroke-width="2"/>`, opts);
}

export function pinHospital(opts?: IconOptions): string {
  return wrapPin(`<rect x="7" y="6" width="10" height="9" rx="1"/><path d="M12 7.5V13.5M9 10.5H15" stroke="var(--severity-critical, #ef4444)" stroke-width="2"/>`, opts);
}

export function pinEmergencyCenter(opts?: IconOptions): string {
  return wrapPin(`<polygon points="12,5.5 16.5,14 7.5,14"/><line x1="12" y1="8.5" x2="12" y2="11.5" stroke-width="1.8"/><circle cx="12" cy="13" r="0.75" fill="currentColor"/>`, opts);
}

export function pinWeatherStation(opts?: IconOptions): string {
  return wrapPin(`<path d="M8 12C8 9.8 9.8 8 12 8C14.2 8 16 9.8 16 12H8Z"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="12" y1="6" x2="12" y2="8"/>`, opts);
}

export function pinObservationTower(opts?: IconOptions): string {
  return wrapPin(`<path d="M9 16L11 6H13L15 16M8 11H16M7 16H17"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/>`, opts);
}

// Zones & Special Areas
export function pinEezMarker(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="10.5" r="4.5" stroke-dasharray="2 1.5"/><text x="12" y="12" font-size="5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">EEZ</text>`, opts);
}

export function pinRestrictedZone(opts?: IconOptions): string {
  return wrapPin(`<polygon points="12,5.5 16.5,14.5 7.5,14.5" stroke="var(--severity-high, #f97316)"/><line x1="12" y1="8.5" x2="12" y2="11.5" stroke-width="1.8"/><circle cx="12" cy="13" r="0.75" fill="currentColor"/>`, opts);
}

export function pinDangerArea(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="10.5" r="4.5" stroke="var(--severity-critical, #ef4444)" fill="var(--severity-critical, #ef4444)" fill-opacity="0.2"/><path d="M10 8.5L14 12.5M14 8.5L10 12.5" stroke="var(--severity-critical, #ef4444)" stroke-width="1.8"/>`, opts);
}

export function pinMilitaryExerciseArea(opts?: IconOptions): string {
  return wrapPin(`<rect x="7.5" y="6" width="9" height="9" stroke-dasharray="2 1"/><path d="M9.5 8L14.5 13M14.5 8L9.5 13"/>`, opts);
}

export function pinChokepoint(opts?: IconOptions): string {
  return wrapPin(`<path d="M6 7L10 10.5L6 14M18 7L14 10.5L18 14" stroke-width="2"/><line x1="12" y1="6" x2="12" y2="15" stroke-dasharray="1.5 1.5"/>`, opts);
}

export function pinAnchorArea(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="7" r="1.5"/><path d="M12 8.5V14.5M8 11.5C8 13.5 10 15 12 15C14 15 16 13.5 16 11.5"/>`, opts);
}

export function pinPilotBoarding(opts?: IconOptions): string {
  return wrapPin(`<circle cx="12" cy="10.5" r="4.5"/><path d="M12 6V15M7.5 10.5H16.5"/>`, opts);
}
