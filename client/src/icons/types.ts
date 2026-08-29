/**
 * Shared Type Definitions for Tactical Icon System
 */

export interface IconOptions {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  heading?: number;
}

export interface OverlayOptions {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export interface MotionOptions {
  length?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export interface ClusterOptions {
  count: number;
  size?: number;
  color?: string;
  className?: string;
}
