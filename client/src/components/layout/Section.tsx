import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface SectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  level?: 1 | 2 | 3;
  wide?: boolean;
  containerClassName?: string;
}

export function Section({
  id,
  title,
  subtitle,
  children,
  className,
  level = 2,
  wide = false,
  containerClassName,
}: SectionProps) {
  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return (
    <section
      id={id}
      className={cn('scroll-mt-24 py-10 md:py-14', className)}
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      <div className={cn(wide ? 'w-full' : 'max-w-3xl')}>
        <HeadingTag
          id={id ? `${id}-heading` : undefined}
          className={cn(
            'font-display font-semibold tracking-tight text-[var(--color-fg)]',
            level === 1 && 'text-4xl md:text-5xl',
            level === 2 && 'text-3xl md:text-4xl',
            level === 3 && 'text-2xl md:text-3xl'
          )}
        >
          {title}
        </HeadingTag>
        {subtitle && (
          <p className="mt-3 font-ui text-lg text-[var(--color-fg-muted)]">{subtitle}</p>
        )}
      </div>
      <div className={cn('prose-body mt-4', wide ? 'w-full' : 'max-w-3xl', containerClassName)}>
        {children}
      </div>
    </section>
  );
}
