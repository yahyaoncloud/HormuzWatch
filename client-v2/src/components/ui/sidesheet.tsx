import { X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

export interface SideSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  side?: 'left' | 'right';
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SideSheet({
  open,
  onClose,
  title,
  subtitle,
  side = 'right',
  children,
  footer,
  className,
}: SideSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (open) {
      setMounted(true);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      timer = setTimeout(() => setMounted(false), 300);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (timer) clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        className={cn(
          'fixed inset-y-0 flex max-w-full transition-transform duration-300 ease-in-out',
          side === 'right' ? 'right-0' : 'left-0',
          visible
            ? 'translate-x-0'
            : side === 'right'
              ? 'translate-x-full'
              : '-translate-x-full'
        )}
      >
        <div
          className={cn(
            'w-screen max-w-md bg-[var(--color-bg-elevated)] border-l border-[var(--color-border)] shadow-2xl flex flex-col',
            side === 'left' && 'border-r border-l-0',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <div>
              {title && (
                <h3 className="font-display text-lg font-bold text-[var(--color-fg)]">{title}</h3>
              )}
              {subtitle && (
                <p className="font-ui text-xs text-[var(--color-fg-muted)] mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>

          {/* Optional Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
