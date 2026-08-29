/**
 * Tactical Maritime Vessel Symbol Generators (27 Unique Types)
 * All icons render in 24x24 viewBox, top-down vessel orientation (bow 000° = pointing UP/NORTH).
 * Clean paths, precise hull geometries, no filters/gradients, CSS variable styling.
 */

import type { IconOptions } from '../types';

function wrapSvg(pathContent: string, options: IconOptions = {}): string {
  const size = options.size ?? 24;
  const color = options.color ?? 'var(--contact-vessel, #a78bfa)';
  const strokeW = options.strokeWidth ?? 1.5;
  const cls = options.className ? ` class="${options.className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"${cls} style="color: ${color};">
  <g stroke="currentColor" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round">
    ${pathContent}
  </g>
</svg>`;
}

// 1. Cargo Ship (Standard merchant vessel hull with rear superstructure & hatch grid)
export function iconVesselCargo(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L17 7V19C17 20.5 14.8 22 12 22C9.2 22 7 20.5 7 19V7L12 2Z" fill="currentColor" fill-opacity="0.15"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
    <rect x="8.5" y="17.5" width="7" height="2.5" rx="0.5" fill="currentColor" fill-opacity="0.4"/>
  `, opts);
}

// 2. Container Ship (Elongated hull with stacked container grid pattern)
export function iconVesselContainer(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5L17.5 6.5V19.5C17.5 21 15 22.5 12 22.5C9 22.5 6.5 21 6.5 19.5V6.5L12 1.5Z" fill="currentColor" fill-opacity="0.15"/>
    <rect x="8" y="7" width="3.5" height="3" fill="currentColor" fill-opacity="0.3"/>
    <rect x="12.5" y="7" width="3.5" height="3" fill="currentColor" fill-opacity="0.3"/>
    <rect x="8" y="11" width="3.5" height="3" fill="currentColor" fill-opacity="0.3"/>
    <rect x="12.5" y="11" width="3.5" height="3" fill="currentColor" fill-opacity="0.3"/>
    <rect x="8" y="15" width="3.5" height="3" fill="currentColor" fill-opacity="0.3"/>
    <rect x="12.5" y="15" width="3.5" height="3" fill="currentColor" fill-opacity="0.3"/>
  `, opts);
}

// 3. Oil Tanker (Wide beam hull with central manifold piping cross)
export function iconVesselOilTanker(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L18 7.5V19C18 20.8 15.3 22 12 22C8.7 22 6 20.8 6 19V7.5L12 2Z" fill="currentColor" fill-opacity="0.2"/>
    <circle cx="12" cy="11" r="2.5"/>
    <line x1="12" y1="6" x2="12" y2="16"/>
    <line x1="8" y1="11" x2="16" y2="11"/>
  `, opts);
}

// 4. Chemical Tanker (Divided tanks with hazard warning indicator)
export function iconVesselChemicalTanker(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L18 7.5V19C18 20.8 15.3 22 12 22C8.7 22 6 20.8 6 19V7.5L12 2Z" fill="currentColor" fill-opacity="0.2"/>
    <line x1="12" y1="7" x2="12" y2="18"/>
    <line x1="8" y1="10" x2="16" y2="10"/>
    <line x1="8" y1="14" x2="16" y2="14"/>
    <polygon points="12,11 13.5,13.5 10.5,13.5" fill="currentColor"/>
  `, opts);
}

// 5. LNG Carrier (Recognizable spherical tank domes along centerline)
export function iconVesselLngCarrier(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5L18 6.5V19.5C18 21.2 15.3 22.5 12 22.5C8.7 22.5 6 21.2 6 19.5V6.5L12 1.5Z" fill="currentColor" fill-opacity="0.15"/>
    <circle cx="12" cy="7.5" r="2.2" fill="currentColor" fill-opacity="0.4"/>
    <circle cx="12" cy="12.5" r="2.2" fill="currentColor" fill-opacity="0.4"/>
    <circle cx="12" cy="17.5" r="2.2" fill="currentColor" fill-opacity="0.4"/>
  `, opts);
}

// 6. Bulk Carrier (Large open hold compartments along hull)
export function iconVesselBulkCarrier(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L17.5 7V19.5C17.5 21 15 22.2 12 22.2C9 22.2 6.5 21 6.5 19.5V7L12 2Z" fill="currentColor" fill-opacity="0.15"/>
    <rect x="8.5" y="7" width="7" height="3" rx="0.5"/>
    <rect x="8.5" y="11" width="7" height="3" rx="0.5"/>
    <rect x="8.5" y="15" width="7" height="3" rx="0.5"/>
  `, opts);
}

// 7. Passenger Ship (Sleek multi-deck silhouette)
export function iconVesselPassenger(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L16.5 7V20C16.5 21.2 14.5 22 12 22C9.5 22 7.5 21.2 7.5 20V7L12 2Z" fill="currentColor" fill-opacity="0.15"/>
    <path d="M9 8H15M9 11H15M9 14H15M9 17H15"/>
  `, opts);
}

// 8. Cruise Ship (Wide luxury liner superstructure with stern deck pool)
export function iconVesselCruise(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5L17 6.5V20.5C17 21.6 14.8 22.5 12 22.5C9.2 22.5 7 21.6 7 20.5V6.5L12 1.5Z" fill="currentColor" fill-opacity="0.15"/>
    <path d="M8.5 6.5H15.5V17.5H8.5Z" fill="currentColor" fill-opacity="0.25"/>
    <line x1="8.5" y1="10" x2="15.5" y2="10"/>
    <line x1="8.5" y1="14" x2="15.5" y2="14"/>
  `, opts);
}

// 9. RoRo Vessel (Roll-on Roll-off vehicle carrier square stern hull)
export function iconVesselRoro(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L17.5 7.5V20.5H6.5V7.5L12 2Z" fill="currentColor" fill-opacity="0.2"/>
    <line x1="6.5" y1="20.5" x2="17.5" y2="20.5" stroke-width="2.5"/>
    <path d="M9 10H15V17H9Z"/>
    <line x1="12" y1="10" x2="12" y2="17"/>
  `, opts);
}

// 10. Fishing Vessel (Compact hull with outrigger net booms)
export function iconVesselFishing(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 3L15.5 8V18C15.5 19.2 14 20 12 20C10 20 8.5 19.2 8.5 18V8L12 3Z"/>
    <line x1="3" y1="11" x2="21" y2="11"/>
    <line x1="3" y1="11" x2="6" y2="17"/>
    <line x1="21" y1="11" x2="18" y2="17"/>
  `, opts);
}

// 11. Tug Boat (Stout wide hull with prominent push knee bow)
export function iconVesselTug(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M9 3H15L17 7V17C17 19 14.8 20 12 20C9.2 20 7 19 7 17V7L9 3Z" fill="currentColor" fill-opacity="0.25"/>
    <rect x="9" y="8" width="6" height="6" rx="1" fill="currentColor" fill-opacity="0.4"/>
    <line x1="7" y1="3" x2="17" y2="3" stroke-width="2"/>
  `, opts);
}

// 12. Pilot Boat (Agile fast hull with pilot flag stripe)
export function iconVesselPilot(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L15.5 7V19C15.5 20.2 14 21 12 21C10 21 8.5 20.2 8.5 19V7L12 2Z"/>
    <circle cx="12" cy="11" r="2" fill="currentColor"/>
    <line x1="12" y1="13" x2="12" y2="18"/>
  `, opts);
}

// 13. Patrol Boat (Sharp stealth bow with forward gun mount dot)
export function iconVesselPatrol(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5L15.5 7V20.5L12 22L8.5 20.5V7L12 1.5Z" fill="currentColor" fill-opacity="0.2"/>
    <circle cx="12" cy="7" r="1.2" fill="currentColor"/>
    <line x1="12" y1="10" x2="12" y2="17"/>
  `, opts);
}

// 14. Fast Attack Craft (Sleek sharp wedge with missile canister mounts)
export function iconVesselFastAttack(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1L16 8V20.5L12 22.5L8 20.5V8L12 1Z" fill="currentColor" fill-opacity="0.25"/>
    <line x1="6.5" y1="13" x2="9" y2="13"/>
    <line x1="15" y1="13" x2="17.5" y2="13"/>
    <circle cx="12" cy="7" r="1" fill="currentColor"/>
  `, opts);
}

// 15. Coast Guard (Patrol hull with distinctive CG slash emblem)
export function iconVesselCoastGuard(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5L16 7V20C16 21.2 14.2 22 12 22C9.8 22 8 21.2 8 20V7L12 1.5Z"/>
    <line x1="9" y1="10" x2="15" y2="8"/>
    <line x1="9" y1="13" x2="15" y2="11"/>
  `, opts);
}

// 16. Frigate (Sleek naval hull with radar mast cross and gun turret)
export function iconVesselFrigate(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1L16 6.5V20.5L12 22L8 20.5V6.5L12 1Z" fill="currentColor" fill-opacity="0.2"/>
    <circle cx="12" cy="6" r="1.2" fill="currentColor"/>
    <line x1="9.5" y1="11" x2="14.5" y2="11"/>
    <line x1="12" y1="9" x2="12" y2="17"/>
  `, opts);
}

// 17. Destroyer (Long sharp tactical hull, dual missile VLS blocks)
export function iconVesselDestroyer(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 0.8L16.5 6V20.5L12 22.5L7.5 20.5V6L12 0.8Z" fill="currentColor" fill-opacity="0.25"/>
    <rect x="10" y="7" width="4" height="2.5" fill="currentColor"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <rect x="10" y="14.5" width="4" height="2.5" fill="currentColor"/>
  `, opts);
}

// 18. Corvette (Compact heavy warship hull)
export function iconVesselCorvette(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5L15.5 6.5V19.5L12 21.5L8.5 19.5V6.5L12 1.5Z" fill="currentColor" fill-opacity="0.2"/>
    <circle cx="12" cy="6" r="1" fill="currentColor"/>
    <line x1="10" y1="11" x2="14" y2="11"/>
    <rect x="10" y="13.5" width="4" height="3" fill="currentColor" fill-opacity="0.3"/>
  `, opts);
}

// 19. Aircraft Carrier (Flat top angled flight deck silhouette)
export function iconVesselCarrier(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1L19 5.5V19.5L15 22.5H9L5 19.5V5.5L12 1Z" fill="currentColor" fill-opacity="0.25"/>
    <line x1="7" y1="6" x2="14" y2="20" stroke-dasharray="2 1.5"/>
    <rect x="16" y="11" width="2" height="5" fill="currentColor"/>
  `, opts);
}

// 20. Amphibious Assault Ship (Flat flight deck with well deck stern notch)
export function iconVesselAmphibious(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5L18 6V20H15V22H9V20H6V6L12 1.5Z" fill="currentColor" fill-opacity="0.2"/>
    <line x1="12" y1="5" x2="12" y2="18" stroke-dasharray="2 1.5"/>
    <rect x="15.5" y="10" width="1.5" height="5" fill="currentColor"/>
  `, opts);
}

// 21. Mine Hunter (Non-magnetic hull profile with sonar boom circle)
export function iconVesselMineHunter(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L16.5 7V19.5C16.5 20.8 14.5 21.8 12 21.8C9.5 21.8 7.5 20.8 7.5 19.5V7L12 2Z"/>
    <circle cx="12" cy="13" r="3" stroke-dasharray="2 1"/>
    <circle cx="12" cy="13" r="1" fill="currentColor"/>
  `, opts);
}

// 22. Submarine (Submerged teardrop hull with conning tower)
export function iconVesselSubmarine(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1.5C14.5 1.5 16 4 16 8V16C16 19.5 14.5 22.5 12 22.5C9.5 22.5 8 19.5 8 16V8C8 4 9.5 1.5 12 1.5Z" fill="currentColor" fill-opacity="0.2"/>
    <rect x="10.5" y="8.5" width="3" height="5" rx="1" fill="currentColor"/>
    <line x1="12" y1="1" x2="12" y2="4"/>
  `, opts);
}

// 23. Support Ship (Naval auxiliary / replenishment vessel with cranes)
export function iconVesselSupport(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L17 7V19.5C17 20.8 14.8 22 12 22C9.2 22 7 20.8 7 19.5V7L12 2Z"/>
    <line x1="6" y1="11" x2="18" y2="11"/>
    <line x1="6" y1="15" x2="18" y2="15"/>
    <line x1="12" y1="7" x2="12" y2="19"/>
  `, opts);
}

// 24. Research Vessel (A-frame derrick crane on aft deck)
export function iconVesselResearch(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L16.5 7V19.5C16.5 20.8 14.5 21.8 12 21.8C9.5 21.8 7.5 20.8 7.5 19.5V7L12 2Z"/>
    <path d="M9 19L12 13L15 19"/>
    <circle cx="12" cy="9" r="1.5"/>
  `, opts);
}

// 25. Dredger (Suction arm / trailing draghead geometry)
export function iconVesselDredger(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L17.5 7.5V19.5H6.5V7.5L12 2Z"/>
    <line x1="4" y1="10" x2="20" y2="16"/>
    <circle cx="20" cy="16" r="1.5" fill="currentColor"/>
  `, opts);
}

// 26. Yacht (Sleek pointed pleasure craft hull)
export function iconVesselYacht(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 1L15 6V19.5L12 21.5L9 19.5V6L12 1Z" fill="currentColor" fill-opacity="0.15"/>
    <path d="M10.5 7L12 4L13.5 7V15H10.5V7Z" fill="currentColor" fill-opacity="0.3"/>
  `, opts);
}

// 27. High-Speed Craft (Catamaran dual hull lines)
export function iconVesselHighSpeedCraft(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M7 2L9.5 6V19L7 21L4.5 19V6L7 2Z" fill="currentColor" fill-opacity="0.2"/>
    <path d="M17 2L19.5 6V19L17 21L14.5 19V6L17 2Z" fill="currentColor" fill-opacity="0.2"/>
    <rect x="9.5" y="8" width="5" height="8" rx="0.5" fill="currentColor" fill-opacity="0.3"/>
  `, opts);
}

// 28. Unknown Vessel (Dashed hull outline with central ?)
export function iconVesselUnknown(opts?: IconOptions): string {
  return wrapSvg(`
    <path d="M12 2L17 7.5V19C17 20.5 14.8 22 12 22C9.2 22 7 20.5 7 19V7.5L12 2Z" stroke-dasharray="2 1.5"/>
    <path d="M11 10.5C11 9.7 11.4 9 12 9C12.6 9 13 9.4 13 10C13 10.8 12 11.2 12 12M12 14v.5" stroke-width="1.25"/>
  `, opts);
}
