import type { ReactNode } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  className,
  showClose = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      contentRef.current?.focus();

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) onClose();
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
        previousActiveElement.current?.focus();
      };
    }
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={subtitle ? 'modal-subtitle' : undefined}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          'relative w-full border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-lg',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-3 mb-3">
            <div>
              {title && (
                <h2 id="modal-title" className="font-display text-base font-semibold text-[var(--color-fg)]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p id="modal-subtitle" className="mt-0.5 font-ui text-xs text-[var(--color-fg-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)] transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  position?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  position = 'right',
  size = 'md',
  className,
  showClose = true,
  closeOnOverlayClick = true,
}: DrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      contentRef.current?.focus();

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
        previousActiveElement.current?.focus();
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: position === 'bottom' ? 'h-[30vh] max-h-[40vh]' : 'w-72',
    md: position === 'bottom' ? 'h-[50vh] max-h-[60vh]' : 'w-96',
    lg: position === 'bottom' ? 'h-[70vh] max-h-[80vh]' : 'w-[32rem]',
    full: position === 'bottom' ? 'h-[90vh]' : 'w-full max-w-[40rem]',
  };

  const positionClasses = {
    right: 'right-0',
    left: 'left-0',
    bottom: 'bottom-0 left-0 right-0',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-sm"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'drawer-title' : undefined}
      aria-describedby={subtitle ? 'drawer-subtitle' : undefined}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          'relative border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg flex flex-col',
          sizeClasses[size],
          positionClasses[position],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between border-b border-[var(--color-border)] p-3">
            <div className="pr-4">
              {title && (
                <h2 id="drawer-title" className="font-display text-base font-semibold text-[var(--color-fg)]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p id="drawer-subtitle" className="mt-0.5 font-ui text-xs text-[var(--color-fg-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)] transition-colors shrink-0"
                aria-label="Close drawer"
              >
                {position === 'bottom' ? (
                  <ChevronDown className="h-4 w-4" />
                ) : position === 'left' ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90',
    primary: 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]',
    warning: 'bg-[var(--color-warning)] text-[var(--color-fg)] hover:bg-[var(--color-warning)]/90',
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="font-ui text-sm text-[var(--color-fg-muted)] mb-4">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-3.5 py-2 border border-[var(--color-border)] text-xs font-medium rounded-md hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn('px-3.5 py-2 text-xs font-medium rounded-md transition-colors', variantStyles[variant])}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
