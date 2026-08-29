import type { ReactNode } from 'react';
import { type TOCItem } from './FloatingTOC';
import { cn } from '@/utils/cn';

export function PageContainer({
  children,
  className,
  showTOC = false,
  tocItems = [],
  activeTocId,
  onTocNavigate,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  showTOC?: boolean;
  tocItems?: TOCItem[];
  activeTocId?: string;
  onTocNavigate?: (id: string) => void;
  wide?: boolean;
}) {
  if (showTOC && tocItems.length > 0) {
    return (
      <div className={cn('mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8', className)}>
        <div className="flex flex-col lg:flex-row lg:gap-10">
          {/* Main Article Content */}
          <main className="min-w-0 flex-1 py-2">
            {children}
          </main>

          {/* Table of Contents Sidebar (Navbar-matching highlight style) */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-14 max-h-[calc(100vh-5rem)] overflow-y-auto py-2 border-l border-[var(--color-border)] pl-1 rounded-none">
              <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] px-3">
                On This Page
              </h3>
              <ul className="space-y-0.5">
                {tocItems.map((item) => {
                  const isActive = activeTocId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onTocNavigate?.(item.id)}
                        className={cn(
                          'block w-full text-left rounded-none font-ui transition-colors',
                          item.level === 1 ? 'px-3 py-1.5 text-xs' : 'pl-6 pr-3 py-1 text-[11px]',
                          isActive
                            ? 'bg-primary-500/15 text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] font-semibold border-l-2 border-primary-500'
                            : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]'
                        )}
                      >
                        <span className="truncate">{item.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('mx-auto px-5 py-8 sm:px-8 sm:py-10', wide ? 'max-w-7xl' : 'max-w-5xl', className)}>
      {children}
    </div>
  );
}
