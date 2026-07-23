import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export function DisclaimerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      setMounted(true);
      raf = requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timer = setTimeout(() => setMounted(false), 300);
    }
    return () => {
      cancelAnimationFrame(raf);
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
    <div className="fixed inset-0 z-50" aria-hidden={!open} role="dialog" aria-modal="true">
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-[var(--color-overlay,rgba(2,6,23,0.6))] backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] transition-all duration-300 ease-out',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 rounded-xl bg-[var(--color-warning-muted,rgba(251,191,36,0.15))] flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" aria-hidden="true" />
              </div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-fg)]">
                Important Notice
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1.5 text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
            >
              <X size={18} />
            </button>
          </div>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed mb-6">
            HormuzWatch aggregates open-source telemetry (AIS, ADS-B, satellite, news) and applies
            machine-learning models to produce risk estimates. This is an{' '}
            <strong>informational publication</strong>, not an operational warning system. Data may
            be delayed, incomplete, or contain classification errors. Do not rely on this service
            for navigation, tactical decisions, or safety-of-life purposes.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              I Understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
