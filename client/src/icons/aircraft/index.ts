/**
 * Tactical Aircraft Symbol Generators (20 Unique Types)
 * All icons render in 24x24 viewBox, top-down tactical orientation (heading 000° = pointing UP/NORTH).
 * Clean paths, no filters/gradients, CSS variable styling.
 */

import type { IconOptions } from '../types';

function wrapSvg(pathContent: string, options: IconOptions = {}): string {
  const size = options.size ?? 24;
  const color = options.color ?? 'var(--contact-aircraft, #38bdf8)';
  const strokeW = options.strokeWidth ?? 1.5;
  const cls = options.className ? ` class="${options.className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"${cls} style="color: ${color};">
  <g stroke="currentColor" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round">
    ${pathContent}
  </g>
</svg>`;
}

// 1. Commercial Airliner (Swept wing, wide span, T-tail / standard tail)
export function iconAircraftCommercial(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L13.5 9L21 13V15L13.5 13L13 20L15.5 21.5V23L12 22L8.5 23V21.5L11 20L10.5 13L3 15V13L10.5 9L12 2Z" fill="currentColor" fill-opacity="0.15"/>
  `, opts);
}

// 2. Cargo Aircraft (Heavy fuselage, high wing, wide tail)
export function iconAircraftCargo(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M10.5 2H13.5L15 8L22 11V13.5L15 12V19.5L17.5 21V22.5L12 21.5L6.5 22.5V21L9 19.5V12L2 13.5V11L9 8L10.5 2Z" fill="currentColor" fill-opacity="0.2"/>
    <line x1="8" y1="11" x2="16" y2="11"/>
  `, opts);
}

// 3. Business Jet (Sleek swept wing, twin rear engines)
export function iconAircraftBusinessJet(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L13 9.5L20 14V15.5L13 13.5L12.5 18L14.5 19.5V21L12 20L9.5 21V19.5L11.5 18L11 13.5L4 15.5V14L11 9.5L12 2Z"/>
    <circle cx="10" cy="17" r="0.75" fill="currentColor"/>
    <circle cx="14" cy="17" r="0.75" fill="currentColor"/>
  `, opts);
}

// 4. Helicopter (Rotor blades cross, fuselage center dot)
export function iconAircraftHelicopter(opts?: IconOptions): string {
  return wrapSvg(`
    <line x1="12" y1="2" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M10 7C10 5.5 10.8 4.5 12 4.5C13.2 4.5 14 5.5 14 7V15L12.5 18H11.5L10 15V7Z" fill="currentColor" fill-opacity="0.25"/>
    <path d="M10 20L14 20M12 18V22"/>
  `, opts);
}

// 5. Fighter (Delta wing, sharp nose, twin vertical stabilizers)
export function iconAircraftFighter(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L14 9L21 16V17.5L13.5 15.5L13 20L15 22H13.5L12 20.5L10.5 22H9L11 20L10.5 15.5L3 17.5V16L10 9L12 2Z" fill="currentColor" fill-opacity="0.2"/>
  `, opts);
}

// 6. Interceptor (High speed needle nose, swept delta wing)
export function iconAircraftInterceptor(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1L13.5 9L19.5 17V18L13 16L12.5 21L14.5 22.5H9.5L11.5 21L11 16L4.5 18V17L10.5 9L12 1Z"/>
    <line x1="12" y1="1" x2="12" y2="7"/>
  `, opts);
}

// 7. Bomber (Large flying wing / heavy delta silhouette)
export function iconAircraftBomber(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 3L14 7L23 15L21.5 17L15 15.5L14 21L12 20L10 21L9 15.5L2.5 17L1 15L10 7L12 3Z" fill="currentColor" fill-opacity="0.25"/>
  `, opts);
}

// 8. Trainer (Compact straight wing aircraft)
export function iconAircraftTrainer(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 3L13 9L19 12V13.5L13 12.5V19L15 20.5V21.5L12 21L9 21.5V20.5L11 19V12.5L5 13.5V12L11 9L12 3Z"/>
  `, opts);
}

// 9. Transport (Tactical military transport, high wing with engine nacelles)
export function iconAircraftTransport(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M11 2H13L14.5 8L22 11.5V13.5L14.5 12.5V19L17 20.5V22L12 21L7 22V20.5L9.5 19V12.5L2 13.5V11.5L9.5 8L11 2Z" fill="currentColor" fill-opacity="0.2"/>
    <line x1="6" y1="10.5" x2="6" y2="13"/>
    <line x1="18" y1="10.5" x2="18" y2="13"/>
  `, opts);
}

// 10. AWACS (Airliner profile with rotodome disk on spine)
export function iconAircraftAwacs(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L13.5 9L21 13V15L13.5 13L13 20L15.5 21.5V23L12 22L8.5 23V21.5L11 20L10.5 13L3 15V13L10.5 9L12 2Z"/>
    <ellipse cx="12" cy="14.5" rx="4" ry="2" fill="currentColor" fill-opacity="0.3"/>
  `, opts);
}

// 11. Aerial Tanker (Transport profile with trailing refuel boom line)
export function iconAircraftTanker(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L13.5 9L21 13V15L13.5 13L13 19.5L15.5 21V22L12 21.5L8.5 22V21L11 19.5L10.5 13L3 15V13L10.5 9L12 2Z"/>
    <line x1="12" y1="21.5" x2="12" y2="24" stroke-dasharray="1.5 1.5"/>
  `, opts);
}

// 12. Recon Aircraft (Long slender wings, high aspect ratio)
export function iconAircraftRecon(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L13 8L23 11V12.5L13 11.5L12.5 19.5L14.5 21V22L12 21.5L9.5 22V21L11.5 19.5L11 11.5L1 12.5V11L11 8L12 2Z"/>
    <circle cx="12" cy="6" r="1" fill="currentColor"/>
  `, opts);
}

// 13. Maritime Patrol Aircraft (Turboprop wings with underslung radar pod)
export function iconAircraftMaritimePatrol(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M11.5 2H12.5L14 8.5L21.5 11.5V13L14 12.5V19.5L16.5 21V22L12 21.5L7.5 22V21L10 19.5V12.5L2.5 13V11.5L10 8.5L11.5 2Z"/>
    <path d="M11 10H13V14H11Z" fill="currentColor" fill-opacity="0.4"/>
  `, opts);
}

// 14. UAV (Unmanned Aerial Vehicle - Medium Altitude V-Tail)
export function iconAircraftUav(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 3L13 8L22 10.5V12L13 11V18L16 21H14.5L12 19L9.5 21H8L11 18V11L2 12V10.5L11 8L12 3Z"/>
    <path d="M11 4H13V7H11Z" fill="currentColor"/>
  `, opts);
}

// 15. Large Drone (HALE / Stealth flying wing drone)
export function iconAircraftLargeDrone(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 4L15 9L23 14L21.5 16L14 13.5L12 18L10 13.5L2.5 16L1 14L9 9L12 4Z" fill="currentColor" fill-opacity="0.25"/>
    <circle cx="12" cy="9" r="1.2" fill="currentColor"/>
  `, opts);
}

// 16. Small Drone (Quadcopter rotor layout)
export function iconAircraftSmallDrone(opts?: IconOptions): string {
  return wrapSvg(`
    <rect x="10" y="10" width="4" height="4" rx="1" fill="currentColor" fill-opacity="0.3"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <circle cx="5" cy="5" r="2.5"/>
    <circle cx="19" cy="5" r="2.5"/>
    <circle cx="19" cy="19" r="2.5"/>
    <circle cx="5" cy="19" r="2.5"/>
  `, opts);
}

// 17. Unknown Aircraft (Tactical dashed silhouette with central question mark)
export function iconAircraftUnknown(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 3L14 9L21 14V15.5L13.5 14L13 20L15 21.5V22.5L12 22L9 22.5V21.5L11 20L10.5 14L3 15.5V14L10 9L12 3Z" stroke-dasharray="2 1.5"/>
    <path d="M11 10.5C11 9.7 11.4 9 12 9C12.6 9 13 9.4 13 10C13 10.8 12 11.2 12 12M12 14v.5" stroke-width="1.25"/>
  `, opts);
}

// 18. Balloon (High altitude surveillance balloon)
export function iconAircraftBalloon(opts?: IconOptions): string {
  return wrapSvg(`
    <circle cx="12" cy="10" r="7" fill="currentColor" fill-opacity="0.15"/>
    <path d="M12 17L10 21H14L12 17Z"/>
    <line x1="8" y1="14" x2="10" y2="21"/>
    <line x1="16" y1="14" x2="14" y2="21"/>
  `, opts);
}

// 19. Glider (Extremely long narrow wings, minimalist body)
export function iconAircraftGlider(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L12.7 8.5L23.5 10.5V11.5L12.7 10.5L12.5 20.5L14.5 21.5V22.5L12 22L9.5 22.5V21.5L11.5 20.5L11.3 10.5L0.5 11.5V10.5L11.3 8.5L12 2Z"/>
  `, opts);
}

// 20. Emergency Aircraft (Airliner silhouette with cross emblem overlay)
export function iconAircraftEmergency(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L13.5 9L21 13V15L13.5 13L13 20L15.5 21.5V23L12 22L8.5 23V21.5L11 20L10.5 13L3 15V13L10.5 9L12 2Z" stroke="var(--severity-critical, #ef4444)"/>
    <path d="M12 8V14M9" stroke="var(--severity-critical, #ef4444)" stroke-width="2"/>
    <path d="M12 9.5V14.5M9.5 12H14.5" stroke="var(--severity-critical, #ef4444)" stroke-width="1.8"/>
  `, opts);
}
