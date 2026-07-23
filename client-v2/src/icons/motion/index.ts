/**
 * Reusable Motion Indicators (12 Types)
 * Overlays representing contact vector, course, predicted track, and loiter patterns.
 */

import type { MotionOptions } from '../types';

function wrapMotion(content: string, options: MotionOptions = {}): string {
  const color = options.color ?? 'currentColor';
  const strokeW = options.strokeWidth ?? 1.5;
  const cls = options.className ? ` class="${options.className}"` : '';

  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"${cls} style="color: ${color};">
  <g stroke="currentColor" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round">
    ${content}
  </g>
</svg>`;
}

export function motionHeadingArrow(opts?: MotionOptions): string {
  return wrapMotion(`
    <line x1="24" y1="24" x2="24" y2="4" stroke-width="2"/>
    <polygon points="24,2 20,9 28,9" fill="currentColor"/>
  `, opts);
}

export function motionCourseOverGround(opts?: MotionOptions): string {
  return wrapMotion(`
    <line x1="24" y1="24" x2="24" y2="6" stroke-dasharray="3 2"/>
    <circle cx="24" cy="6" r="2" fill="currentColor"/>
  `, opts);
}

export function motionSpeedVector(opts?: MotionOptions): string {
  const len = opts?.length ?? 30;
  return wrapMotion(`
    <line x1="24" y1="24" x2="24" y2="${24 - len}" stroke-width="2"/>
    <line x1="20" y1="${24 - len + 6}" x2="28" y2="${24 - len + 6}"/>
  `, opts);
}

export function motionVelocityLine(opts?: MotionOptions): string {
  return wrapMotion(`
    <line x1="24" y1="24" x2="24" y2="8"/>
  `, opts);
}

export function motionPredictedPosition(opts?: MotionOptions): string {
  return wrapMotion(`
    <line x1="24" y1="24" x2="24" y2="10" stroke-dasharray="2 2"/>
    <circle cx="24" cy="10" r="3" stroke-dasharray="1 1"/>
  `, opts);
}

export function motionTrackHistory(opts?: MotionOptions): string {
  return wrapMotion(`
    <path d="M24 24 L20 30 L16 35 L12 42" stroke-dasharray="2 2" opacity="0.6"/>
    <circle cx="20" cy="30" r="1" fill="currentColor"/>
    <circle cx="16" cy="35" r="1" fill="currentColor"/>
    <circle cx="12" cy="42" r="1" fill="currentColor"/>
  `, opts);
}

export function motionWakeTrail(opts?: MotionOptions): string {
  return wrapMotion(`
    <path d="M24 24 L18 40 M24 24 L30 40" opacity="0.4" stroke-dasharray="3 2"/>
  `, opts);
}

export function motionFlightTrail(opts?: MotionOptions): string {
  return wrapMotion(`
    <line x1="24" y1="24" x2="24" y2="46" opacity="0.3" stroke-dasharray="4 2"/>
  `, opts);
}

export function motionOrbitPattern(opts?: MotionOptions): string {
  return wrapMotion(`
    <ellipse cx="24" cy="24" rx="16" ry="10" stroke-dasharray="3 2"/>
    <polygon points="40,24 36,21 36,27" fill="currentColor"/>
  `, opts);
}

export function motionHoldingPattern(opts?: MotionOptions): string {
  return wrapMotion(`
    <rect x="10" y="14" width="28" height="20" rx="10" stroke-dasharray="3 2"/>
    <polygon points="38,24 34,21 34,27" fill="currentColor"/>
  `, opts);
}

export function motionLoiterPattern(opts?: MotionOptions): string {
  return wrapMotion(`
    <circle cx="24" cy="24" r="14" stroke-dasharray="3 2"/>
    <polygon points="38,24 34,21 34,27" fill="currentColor"/>
  `, opts);
}

export function motionSearchPattern(opts?: MotionOptions): string {
  return wrapMotion(`
    <path d="M12 12 H36 V20 H12 V28 H36 V36 H12" stroke-dasharray="2 2"/>
  `, opts);
}
