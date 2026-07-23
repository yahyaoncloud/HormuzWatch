import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  showDivider?: boolean;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  className,
  showDivider = true,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5', className)}>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-primary-600)]">{icon}</span>
          <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">{title}</h1>
        </div>
        {subtitle && (
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
      {showDivider && <div className="w-full h-px bg-[var(--color-border)] mt-5" />}
    </div>
  );
}

interface PageHeaderActionProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function PageHeaderAction({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  className,
  'aria-label': ariaLabel,
}: PageHeaderActionProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all';
  const variants = {
    primary: 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] hover:border-[var(--color-primary-700)] ',
    secondary: 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]',
    ghost: 'bg-transparent border-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]',
    danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/20',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(baseStyles, variants[variant], disabled && 'opacity-50 cursor-not-allowed', className)}
    >
      {children}
    </button>
  );
}