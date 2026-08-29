import { Monitor, BookOpen, Info, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

export function DesktopOnlyOverlay({
  title = 'Desktop View Required',
  subtitle = 'Command Operations & Intelligence Console',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="md:hidden fixed inset-0 z-[100] bg-[var(--color-bg)] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      <div className="w-full max-w-sm border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-2xl rounded-none flex flex-col items-center text-center relative">
        {/* Top status bar */}
        <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
            <span className="font-data text-[10px] font-bold uppercase tracking-wider text-[var(--color-warning)]">
              VIEWPORT RESTRICTED
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">&lt; 768px</span>
        </div>

        {/* Tactical Icon */}
        <div className="mb-4 p-4 bg-primary-500/10 border border-primary-500/30 text-[var(--color-primary-600)] dark:text-[var(--color-primary-300)] rounded-none">
          <Monitor className="w-10 h-10 stroke-[1.5]" />
        </div>

        {/* Headings */}
        <h2 className="font-display text-base font-bold uppercase tracking-tight text-[var(--color-fg)]">
          {title}
        </h2>
        <p className="font-ui text-xs font-medium text-[var(--color-fg-muted)] mt-1 mb-4">
          {subtitle}
        </p>

        {/* Description */}
        <p className="font-ui text-xs leading-relaxed text-[var(--color-fg-muted)] mb-6 bg-[var(--color-bg-elevated)] p-3 border border-[var(--color-border)] text-left rounded-none">
          The interactive map telemetry, multi-panel analytics, and live radar operations require a desktop display for optimal command oversight. Please access this page from a desktop browser.
        </p>

        {/* Navigation options for mobile */}
        <div className="w-full space-y-2">
          <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] text-left mb-1">
            Available Mobile Pages:
          </div>

          <Link
            to="/docs"
            className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-xs font-medium text-[var(--color-fg)] transition-all rounded-none"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] shrink-0" />
              <span>System Documentation</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </Link>

          <Link
            to="/about"
            className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-xs font-medium text-[var(--color-fg)] transition-all rounded-none"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[var(--color-info)] shrink-0" />
              <span>About HormuzWatch</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </Link>

          <Link
            to="/learn/architecture"
            className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-xs font-medium text-[var(--color-fg)] transition-all rounded-none"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
              <span>System Architecture</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
          </Link>
        </div>
      </div>
    </div>
  );
}
