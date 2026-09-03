import React, { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

export interface TimestampDisplayProps {
  timestamp: string | number | Date | null | undefined;
  format?: 'utc' | 'relative' | 'full' | 'auto';
  className?: string;
  showIcon?: boolean;
}

export const TimestampDisplay: React.FC<TimestampDisplayProps> = ({
  timestamp,
  format = 'auto',
  className,
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!timestamp) {
      setRelativeTime('—');
      return;
    }

    const updateRelative = () => {
      const ms = new Date(timestamp).getTime();
      if (isNaN(ms)) {
        setRelativeTime('—');
        return;
      }
      const diffSec = Math.floor((Date.now() - ms) / 1000);
      if (diffSec < 5) setRelativeTime('just now');
      else if (diffSec < 60) setRelativeTime(`${diffSec}s ago`);
      else if (diffSec < 3600) setRelativeTime(`${Math.floor(diffSec / 60)}m ago`);
      else if (diffSec < 86400) setRelativeTime(`${Math.floor(diffSec / 3600)}h ago`);
      else setRelativeTime(`${Math.floor(diffSec / 86400)}d ago`);
    };

    updateRelative();
    const interval = setInterval(updateRelative, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) {
    return <span className={cn('font-mono text-[10px] text-slate-500', className)}>—</span>;
  }

  const date = new Date(timestamp);
  const isValid = !isNaN(date.getTime());
  if (!isValid) {
    return <span className={cn('font-mono text-[10px] text-slate-500', className)}>—</span>;
  }

  const utcString = date.toISOString().substring(11, 19) + 'Z';
  const fullUtcString = date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';

  let display = utcString;
  if (format === 'relative') {
    display = relativeTime;
  } else if (format === 'full') {
    display = fullUtcString;
  } else if (format === 'auto') {
    display = `${utcString} (${relativeTime})`;
  }

  return (
    <span
      className={cn('font-mono text-[10px] text-[var(--color-fg-muted)] select-none', className)}
      title={`UTC: ${fullUtcString}`}
    >
      {display}
    </span>
  );
};
