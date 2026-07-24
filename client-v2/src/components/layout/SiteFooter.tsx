import { Link } from 'react-router';
import { cn } from '@/utils/cn';

export const Wordmark = ({ className }: { className?: string }) => (
  <Link
    to="/"
    className={cn('flex items-center gap-2 shrink-0', className)}
    aria-label="HormuzWatch Home"
  >
    <svg
      className="w-7 h-7 text-[var(--color-primary-700)]"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
      <path d="M16 6v12M10 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
    <span className="font-display text-xl font-semibold tracking-tight text-[var(--color-fg)]">
      HormuzWatch
    </span>
  </Link>
);

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-5xl px-5 py-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="hidden sm:inline font-ui text-xs text-[var(--color-fg-subtle)]">
            &copy; {new Date().getFullYear()}
          </span>
        </div>

        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          <Link
            to="/about"
            className="font-ui text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            About
          </Link>
          <Link
            to="/intelligence"
            className="font-ui text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            Intelligence
          </Link>
          <Link
            to="/learn"
            className="font-ui text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            Documentation
          </Link>
        </nav>

        <p className="font-ui text-xs text-[var(--color-fg-subtle)] sm:hidden">
          &copy; {new Date().getFullYear()} HormuzWatch
        </p>
      </div>
    </footer>
  );
}
