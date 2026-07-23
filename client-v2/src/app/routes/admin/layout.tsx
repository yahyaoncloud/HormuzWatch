import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAdminStore } from "@/stores";
import { getAdminSession } from "@/lib/auth";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";

export default function AdminRouteGuard() {
  const { isAuthenticated, setSession } = useAdminStore();
  const [initializing, setInitializing] = useState(!isAuthenticated);

  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const session = await getAdminSession();
        if (isMounted) {
          if (session) {
            setSession(session);
          }
        }
      } catch (err) {
        console.error("Admin session initialization error:", err);
      } finally {
        if (isMounted) setInitializing(false);
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [setSession]);

  if (initializing) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#0a0d14] text-[var(--color-fg)] p-6 text-center font-ui selection:bg-[var(--color-primary-600)] selection:text-white">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30">
          <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-sm font-bold tracking-wide text-slate-200 uppercase">
            HormuzWatch Admin Console
          </h2>
          <p className="font-mono text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary-600)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary-600)]" />
            </span>
            Verifying Root Administrator Session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AdminDashboardLayout />;
}
