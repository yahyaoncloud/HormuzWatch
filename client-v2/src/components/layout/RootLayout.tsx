import { AlertCircle, Bell, CheckCircle2, Info, X } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { Navbar } from '@/components/ui/navbar';
import { SiteFooter } from './SiteFooter';
import { cn } from '@/utils/cn';
import { useNotificationStore, useUIStore } from '@/stores';

function ToastContainer() {
  const toasts = useUIStore(s => s.toasts);
  const removeToast = useUIStore(s => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 backdrop-blur-md bg-[var(--color-bg-card)]/95 shadow-xl transition-all',
            t.type === 'success' && 'border-emerald-500/30',
            t.type === 'error' && 'border-red-500/30',
            t.type === 'warning' && 'border-amber-500/30',
            t.type === 'info' && 'border-[var(--color-primary-600)]/30'
          )}
          role="alert"
        >
          {t.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />}
          {t.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />}
          {t.type === 'warning' && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />}
          {t.type === 'info' && <Info className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-primary-600)]" />}
          <div className="flex-1 min-w-0">
            <p className="font-ui text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              {t.title}
            </p>
            {t.message && (
              <p className="mt-0.5 font-ui text-sm text-[var(--color-fg)]">{t.message}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="shrink-0 p-0.5 rounded-lg hover:bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function RootLayout() {
  const notifs = useNotificationStore(s => s.notifs);
  const unread = notifs.filter(n => !n.read).length;
  const showPanel = useNotificationStore(s => s.showPanel);
  const setShowPanel = useNotificationStore(s => s.setShowPanel);
  const togglePanel = useNotificationStore(s => s.togglePanel);
  const markRead = useNotificationStore(s => s.markRead);
  const clearAll = useNotificationStore(s => s.clearAll);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Navbar>
        <Link
          to="/login"
          className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2 font-ui text-sm font-medium transition-colors text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]"
        >
          Login
        </Link>
        {/* Notification Bell */}
        <button
          onClick={togglePanel}
          className="relative flex items-center px-2 py-1.5 border border-[var(--color-border)] text-[12px] font-medium text-[var(--color-fg)] transition-colors ml-1"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
          <Bell className="h-3.5 w-3.5 text-[var(--color-fg-muted)]" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[var(--color-primary-600)] text-[9px] font-bold text-white flex items-center justify-center px-1">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </Navbar>

      {/* Notification Panel (fixed overlay — doesn't push content) */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          {/* Panel */}
          <div className="fixed top-12 right-4 z-50 w-80 max-h-[65vh] bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
              <span className="text-xs font-semibold text-[var(--color-fg)]">
                Notifications ({unread} unread)
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={clearAll} className="text-[10px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors">Clear all</button>
                <button onClick={() => setShowPanel(false)} className="p-0.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
              {notifs.length === 0 ? (
                <div className="text-center text-xs text-[var(--color-fg-muted)] py-8">
                  No notifications
                </div>
              ) : (
                notifs.slice(0, 50).map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors',
                      n.read
                        ? 'border-[var(--color-border)] bg-[var(--color-bg)]'
                        : 'border-[var(--color-primary-200)] bg-[var(--color-primary-50)]'
                    )}
                  >
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      n.type === 'critical' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--color-fg)] truncate">{n.title}</div>
                      <div className="text-[var(--color-fg-muted)] truncate">{n.body}</div>
                    </div>
                    <span className="text-[10px] text-[var(--color-fg-muted)] shrink-0">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <main id="main-content" className="relative flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />

      {/* Universal Toast Container */}
      <ToastContainer />
    </div>
  );
}
