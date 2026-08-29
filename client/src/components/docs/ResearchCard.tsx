import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResearchCardProps {
  title: string;
  authors: string[];
  abstract: string;
  tags: string[];
  venue?: string;
  year?: number;
  pdfUrl?: string;
  doiUrl?: string;
  featured?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResearchCard({
  title,
  authors,
  abstract,
  tags,
  venue,
  year,
  pdfUrl,
  doiUrl,
  featured = false,
  className,
}: ResearchCardProps) {
  return (
    <article
      className={cn(
        'glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 hover:border-[var(--color-primary-300)] transition-all',
        featured && 'border-primary/30 bg-primary/5',
        className
      )}
    >
      {featured && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
          <span className="font-ui text-caption text-primary font-medium uppercase tracking-wider">
            Featured
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-display text-heading-md text-fg leading-snug mb-2">
        {doiUrl ? (
          <a
            href={doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            {title}
          </a>
        ) : (
          title
        )}
      </h3>

      {/* Authors + Venue */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
        <span className="font-ui text-body-sm text-fg-muted">{authors.join(', ')}</span>
        {(venue || year) && (
          <>
            <span className="text-fg-subtle">·</span>
            <span className="font-ui text-body-sm text-fg-subtle">
              {[venue, year].filter(Boolean).join(' · ')}
            </span>
          </>
        )}
      </div>

      {/* Abstract */}
      <p className="font-ui text-body-sm text-fg-muted leading-relaxed line-clamp-3 mb-4">
        {abstract}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded text-caption font-medium bg-background-elevated border border-border/50 text-fg-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      {(pdfUrl || doiUrl) && (
        <div className="flex items-center gap-3 pt-4 border-t border-border/30">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-ui text-body-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              PDF
            </a>
          )}
          {doiUrl && (
            <a
              href={doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background-elevated border border-border/50 text-fg-muted rounded-lg font-ui text-body-sm font-medium hover:text-fg hover:border-primary/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              DOI
            </a>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Grid layout ──────────────────────────────────────────────────────────────

export function ResearchCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', className)}>{children}</div>;
}
