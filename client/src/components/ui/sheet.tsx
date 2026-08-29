import { X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

// ============================================================
// BottomSheet — a sheet that slides up from the bottom edge.
// 70% width, centered, with subtle scale+fade animation.
// Used for metric detail views, settings panel, and mobile nav.
// ============================================================

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: BottomSheetProps) {
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
      timer = setTimeout(() => setMounted(false), 350);
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
    <div className="fixed inset-0 z-[999] flex flex-col justify-end" aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Sheet — centered, 60% width on tablet/desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'relative w-full md:w-[60%] lg:w-[50%] mx-auto flex max-h-[85vh] flex-col rounded-t-2xl border border-[var(--color-border)] border-b-0 bg-[var(--color-bg-card)] shadow-2xl backdrop-blur-2xl transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-2">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate font-display text-lg font-semibold text-[var(--color-fg)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 truncate font-ui text-sm text-[var(--color-fg-muted)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — comfortable reading padding */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full px-5 pb-8">{children}</div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-[var(--color-border)] px-5 py-4">
            <div className="mx-auto w-full">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
