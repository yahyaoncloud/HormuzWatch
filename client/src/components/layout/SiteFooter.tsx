import { Link } from 'react-router';
import { cn } from '@/utils/cn';

export const Wordmark = ({ className }: { className?: string }) => (
  <Link
    to="/"
    className={cn('flex items-center gap-2 shrink-0', className)}
    aria-label="HormuzWatch Home"
  >
    <img src="/apple-touch-icon.png" alt="HormuzWatch Logo" className="w-7 h-7 rounded-md object-contain" />
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
            to="/?tab=about"
            className="font-ui text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            About
          </Link>
          <Link
            to="/?tab=intelligence"
            className="font-ui text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            Intelligence
          </Link>
          <Link
            to="/?tab=docs"
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
