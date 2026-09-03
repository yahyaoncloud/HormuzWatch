import React from 'react';
import { MapPin, Globe, Shield, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FeedEventMetaProps {
  source?: string;
  sourceType?: string;
  region?: string;
  score?: number;
  verified?: boolean;
  className?: string;
}

export const FeedEventMeta: React.FC<FeedEventMetaProps> = ({
  source,
  sourceType,
  region,
  score,
  verified,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 font-mono text-[10px] text-[var(--color-fg-muted)] flex-wrap', className)}>
      {source && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-primary-600)] dark:text-[#38bdf8] uppercase font-bold">
          <Globe className="w-2.5 h-2.5 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          {source} {sourceType && `(${sourceType})`}
        </span>
      )}

      {region && (
        <span className="inline-flex items-center gap-1 text-[var(--color-fg)]">
          <MapPin className="w-2.5 h-2.5 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          {region}
        </span>
      )}

      {score !== undefined && score > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <Activity className="w-2.5 h-2.5" />
          SCORE {score.toFixed(0)}/100
        </span>
      )}

      {verified !== undefined && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-bold uppercase',
            verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          )}
        >
          <Shield className="w-2.5 h-2.5" />
          {verified ? 'VERIFIED' : 'UNVERIFIED'}
        </span>
      )}
    </div>
  );
};
