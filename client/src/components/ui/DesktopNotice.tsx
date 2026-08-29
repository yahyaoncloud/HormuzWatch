import { useState } from 'react';
import { Monitor, X } from 'lucide-react';

export function DesktopNotice({
  title = 'Desktop View Recommended',
  message = 'Command operations & interactive telemetry maps are optimized for desktop view displays. Please open on a larger screen for full access.',
}: {
  title?: string;
  message?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="md:hidden sticky top-12 z-40 w-full bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-3 shadow-md rounded-none">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary-500/10 border border-primary-500/30 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] shrink-0 rounded-none">
          <Monitor className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--color-fg)]">
              {title}
            </h4>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-0.5 rounded-none"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-1 leading-normal">
            {message}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="font-ui text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-hover)] transition-colors rounded-none"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
