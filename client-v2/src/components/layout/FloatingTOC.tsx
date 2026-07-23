import { cn } from '@/utils/cn';

export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

export function FloatingTOC({
  items,
  activeId,
  onNavigate,
}: {
  items: TOCItem[];
  activeId?: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto py-2">
      <h3 className="mb-3 font-ui text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] px-3">
        On This Page
      </h3>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'block w-full text-left rounded-lg font-ui transition-colors',
                  item.level === 1 ? 'px-3 py-1.5 text-xs' : 'pl-6 pr-3 py-1 text-[11px]',
                  isActive
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] font-medium'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]'
                )}
              >
                <span className="truncate">{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
