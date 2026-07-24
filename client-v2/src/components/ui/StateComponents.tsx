import type { ReactNode } from 'react';
import { Loader2, AlertTriangle, Inbox, Search, Database, WifiOff, Shield } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoadingStateProps {
  message?: string;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  icon,
  size = 'md',
  className,
  fullScreen = false,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-[2px]',
    md: 'h-8 w-8 border-[2px]',
    lg: 'h-12 w-12 border-[3px]',
  };

  const textSizes = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullScreen && 'fixed inset-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-sm',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {icon || (
        <div
          className={cn(
            'animate-spin border-[var(--color-primary-600)] border-t-transparent rounded-full',
            sizeClasses[size]
          )}
          aria-hidden="true"
        />
      )}
      <span className={cn('font-mono text-[var(--color-fg-muted)]', textSizes[size])}>
        {message}
      </span>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  fullScreen?: boolean;
}

export function ErrorState({
  title = 'Failed to Load',
  message,
  icon,
  onRetry,
  retryLabel = 'Try Again',
  className,
  fullScreen = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'p-8 text-center max-w-md mx-auto rounded-md border border-red-500/30 bg-red-500/5',
        fullScreen && 'my-12',
        className
      )}
      role="alert"
    >
      {icon || <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" aria-hidden="true" />}
      <p className="text-red-500 font-semibold text-sm">{title}</p>
      {message && <p className="text-xs text-[var(--color-fg-muted)] mt-1">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 text-xs font-semibold rounded-md hover:bg-red-500/20 transition-colors inline-flex items-center gap-1.5"
        >
          <Loader2 className="h-3.5 w-3.5" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'dashed' | 'card';
}

export function EmptyState({
  title = 'No Data',
  message,
  icon,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const variants = {
    default: 'text-center py-12 text-[var(--color-fg-muted)] font-mono text-xs border border-dashed border-[var(--color-border)] rounded-md',
    dashed: 'text-center py-12 text-[var(--color-fg-muted)] font-mono text-xs border border-dashed border-[var(--color-border)] rounded-md',
    card: 'text-center py-8 text-[var(--color-fg-muted)]',
  };

  return (
    <div className={cn(variants[variant], className)}>
      {icon && <div className="mx-auto mb-3 text-[var(--color-fg-muted)]/50">{icon}</div>}
      <p className="font-semibold text-[var(--color-fg)] text-sm">{title}</p>
      {message && <p className="mt-1 text-xs">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export const CommonEmptyStates = {
  noEvents: () => (
    <EmptyState
      title="No Intelligence Events"
      message="No events match your current filter criteria."
      icon={<Inbox className="h-8 w-8" />}
    />
  ),
  noThreats: () => (
    <EmptyState
      title="No Active Threats"
      message="No threats match your current filter parameters."
      icon={<Shield className="h-8 w-8" />}
    />
  ),
  noSearchResults: () => (
    <EmptyState
      title="No Results Found"
      message="Try adjusting your search or filter criteria."
      icon={<Search className="h-8 w-8" />}
    />
  ),
  noData: () => (
    <EmptyState
      title="No Data Available"
      message="Data will appear here once the pipeline is active."
      icon={<Database className="h-8 w-8" />}
    />
  ),
  offline: () => (
    <EmptyState
      title="Offline"
      message="Unable to connect to the intelligence backend."
      icon={<WifiOff className="h-8 w-8" />}
    />
  ),
};