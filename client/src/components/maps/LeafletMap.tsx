import { lazy, Suspense, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import type { LeafletMapProps } from './LeafletMapInner';

export type { LeafletMapProps } from './LeafletMapInner';

export const DEFAULT_GULF_BOUNDS = [
  [11.0, 34.0],
  [36.0, 65.0],
];

export const LOCKED_BOUNDS = [
  [21.0, 47.0],
  [31.0, 63.0],
];

const LeafletMapInner = lazy(() => import('./LeafletMapInner'));

export function LeafletMap(props: LeafletMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || typeof window === 'undefined') {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] font-ui text-sm',
          props.className
        )}
      >
        Loading tactical map...
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] font-ui text-sm',
            props.className
          )}
        >
          Loading tactical map...
        </div>
      }
    >
      <LeafletMapInner {...props} />
    </Suspense>
  );
}
