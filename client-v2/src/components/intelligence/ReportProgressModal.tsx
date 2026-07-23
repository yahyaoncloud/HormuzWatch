import { Loader2 } from 'lucide-react';

export function ReportProgressModal({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-md transition-opacity">
      <div className="flex flex-col items-center gap-4 max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-2xl text-center">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary-600)]" />
          <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-[var(--color-primary-600)]/20" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-display text-lg font-semibold text-[var(--color-fg)]">
            Generating Intelligence Report
          </h3>
          <p className="font-ui text-xs text-[var(--color-fg-muted)]">
            Querying AOR telemetry, synthesizing GDELT feeds, and compiling professional LaTeX
            PDF...
          </p>
        </div>
        <div className="w-full bg-[var(--color-border)] h-1 rounded-full overflow-hidden mt-2 relative">
          <div className="absolute inset-y-0 left-0 bg-[var(--color-primary-600)] w-2/3 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
