import { type ReactNode, useId } from 'react';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricBadgeProps {
  label: string;
  value: string | number;
  color?: 'primary' | 'info' | 'success' | 'warning' | 'danger';
}

export interface DocumentationBlockProps {
  id?: string;
  title: string;
  subtitle?: string;
  level?: 1 | 2 | 3;
  badges?: MetricBadgeProps[];
  children: ReactNode;
  className?: string;
  /** If true, renders a "§" anchor link next to the heading */
  anchorLink?: boolean;
}

// ─── MetricBadge ──────────────────────────────────────────────────────────────

export function MetricBadge({ label, value, color = 'primary' }: MetricBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium border',
        color === 'primary' && 'bg-primary/10 text-primary border-primary/20',
        color === 'info' && 'bg-info/10 text-info border-info/20',
        color === 'success' && 'bg-success/10 text-success border-success/20',
        color === 'warning' && 'bg-warning/10 text-warning border-warning/20',
        color === 'danger' && 'bg-danger/10 text-danger border-danger/20'
      )}
    >
      <span className="font-data font-bold">{value}</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}

// ─── DocumentationBlock ───────────────────────────────────────────────────────

export function DocumentationBlock({
  id,
  title,
  subtitle,
  level = 2,
  badges,
  children,
  className,
  anchorLink = true,
}: DocumentationBlockProps) {
  const fallbackId = useId();
  const headingId = id ?? fallbackId;
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

  const sizeMap = {
    1: 'text-display-lg md:text-display-xl',
    2: 'text-display-md md:text-display-lg',
    3: 'text-display-sm md:text-display-md',
  } as const;

  return (
    <section
      id={id}
      className={cn('py-10 md:py-14 scroll-mt-20', className)}
      aria-labelledby={headingId}
    >
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <Tag
            id={headingId}
            className={cn('font-display font-semibold tracking-tight text-fg', sizeMap[level])}
          >
            {anchorLink && id ? (
              <a href={`#${id}`} className="group relative" aria-label={`Link to ${title}`}>
                {title}
                <span className="ml-2 opacity-0 group-hover:opacity-40 transition-opacity text-primary text-[0.6em]">
                  §
                </span>
              </a>
            ) : (
              title
            )}
          </Tag>

          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {badges.map((b, i) => (
                <MetricBadge key={i} {...b} />
              ))}
            </div>
          )}
        </div>

        {subtitle && <p className="font-ui text-body-lg text-fg-muted max-w-3xl">{subtitle}</p>}

        {/* Divider */}
        <div className="mt-6 h-px bg-gradient-to-r from-primary/30 via-border to-transparent" />
      </header>

      {/* Content */}
      <div className="space-y-6">{children}</div>
    </section>
  );
}

// ─── Prose helpers (inline within doc blocks) ─────────────────────────────────

export function DocParagraph({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-ui text-body text-fg/90 leading-relaxed', className)}>{children}</p>
  );
}

export function DocCallout({
  children,
  type = 'info',
  title,
}: {
  children: ReactNode;
  type?: 'info' | 'warning' | 'danger' | 'success' | 'tip';
  title?: string;
}) {
  const styles = {
    info: { border: 'border-info/30', bg: 'bg-info/5', icon: '🔵', color: 'text-info' },
    warning: { border: 'border-warning/30', bg: 'bg-warning/5', icon: '⚠️', color: 'text-warning' },
    danger: { border: 'border-danger/30', bg: 'bg-danger/5', icon: '🔴', color: 'text-danger' },
    success: { border: 'border-success/30', bg: 'bg-success/5', icon: '✅', color: 'text-success' },
    tip: { border: 'border-primary/30', bg: 'bg-primary/5', icon: '💡', color: 'text-primary' },
  }[type];

  return (
    <div className={cn('rounded-xl border p-4', styles.border, styles.bg)}>
      {title && (
        <div
          className={cn(
            'flex items-center gap-2 font-display font-semibold text-heading-sm mb-2',
            styles.color
          )}
        >
          <span aria-hidden>{styles.icon}</span>
          {title}
        </div>
      )}
      <div className="font-ui text-body text-fg-muted">{children}</div>
    </div>
  );
}

export function DocCodeBlock({
  code,
  language = 'text',
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-border/50">
      {filename && (
        <div className="flex items-center gap-2 px-4 py-2 bg-background-elevated border-b border-border/50">
          <span className="w-2 h-2 rounded-full bg-danger/60" />
          <span className="w-2 h-2 rounded-full bg-warning/60" />
          <span className="w-2 h-2 rounded-full bg-success/60" />
          <span className="ml-2 font-data text-caption text-fg-muted">{filename}</span>
          <span className="ml-auto font-data text-caption text-fg-subtle uppercase">
            {language}
          </span>
        </div>
      )}
      <pre className="bg-background-elevated/50 p-4 overflow-x-auto">
        <code className="font-data text-sm text-fg/90 leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}
