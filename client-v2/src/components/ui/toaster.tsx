import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useUIStore } from '@/stores';
import { cn } from '@/utils/cn';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToasterProps {
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center';
}

const ICONS: Record<ToastType, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const ACCENT: Record<ToastType, string> = {
  info: 'border-info/40 text-info',
  success: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  error: 'border-danger/40 text-danger',
};

const POSITION_CLASSES: Record<NonNullable<ToasterProps['position']>, string> = {
  'top-left': 'top-4 left-4 items-start',
  'top-right': 'top-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
};

export function Toaster({ position = 'bottom-right' }: ToasterProps) {
  const [mounted, setMounted] = useState(false);
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed z-[100] flex w-full max-w-sm flex-col gap-2 p-4',
        POSITION_CLASSES[position]
      )}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-background-elevated/95 p-4 backdrop-blur-sm',
              ACCENT[toast.type]
            )}
            role="alert"
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-ui text-body-sm font-medium text-fg">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 font-ui text-caption text-fg-muted">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-fg-muted transition-colors hover:text-fg"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
