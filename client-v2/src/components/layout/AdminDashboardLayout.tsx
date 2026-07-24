import {
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Eye,
  FileSearch,
  LayoutDashboard,
  Lock,
  Newspaper,
  Radio,
  Rss,
  Search,
  Settings,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { Sidebar } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAdminStore } from '@/stores';
import { env } from "@/environments/environment";

const ADMIN_NAV = [
  { label: 'Admin Overview', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'News Feed', href: '/admin/news', icon: Newspaper },
  { label: 'Events Timeline', href: '/admin/events', icon: Clock },
  { label: 'Threat Board', href: '/admin/threats', icon: ShieldAlert },
  { label: 'Live Tracking', href: '/admin/tracking', icon: Radio },
  { label: 'Data Sources', href: '/admin/sources', icon: Rss },
  { label: 'Surveillance Watchlist', href: '/admin/watchlist', icon: Eye },
  { label: 'User Roster', href: '/admin/users', icon: Users, badge: 'Pending', badgeColor: 'danger' as const },
  { label: 'Dataset Pipeline', href: '/admin/datasets', icon: Database },
  { label: 'Analytics & Reports', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Dataset Analysis', href: '/admin/analysis', icon: BarChart3 },
  { label: 'Audit Trail', href: '/admin/audit', icon: FileSearch },
  { label: 'Site Settings', href: '/admin/settings', icon: Settings },
];

export function AdminDashboardLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout, isVerified } = useAdminStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isAdminEmail = user?.email?.toLowerCase() === env.auth.adminDisplayEmail.toLowerCase();

  // Guard: If admin email doesn't match or not verified, show restricted guard
  if (!user || !isAdminEmail) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] text-[var(--color-fg)] p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--color-danger)]/20 text-[var(--color-danger)] border border-[var(--color-danger)]/30">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Admin Portal Access Restricted</h1>
        <p className="font-ui text-sm text-[var(--color-fg-muted)] max-w-md">
          This secure command area is strictly reserved for the designated root administrator (<code className="font-mono text-[var(--color-primary-600)]">{env.auth.adminDisplayEmail}</code>).
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 bg-[var(--color-primary-600)] text-white font-ui text-xs font-semibold rounded-lg hover:bg-[var(--color-primary-700)] transition-colors"
        >
          Return to Login
        </button>
      </div>
    );
  }

  // Guard: Email verification check
  if (isAdminEmail && !isVerified) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] text-[var(--color-fg)] p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/30">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Admin Verification Required</h1>
        <p className="font-ui text-sm text-[var(--color-fg-muted)] max-w-md">
          Administrator login for <code className="font-mono text-[var(--color-primary-600)]">{env.auth.adminDisplayEmail}</code> requires dual-factor email verification. Please verify your session on the login page.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login?admin-verify=true')}
          className="px-4 py-2 bg-[var(--color-primary-600)] text-white font-ui text-xs font-semibold rounded-lg hover:bg-[var(--color-primary-700)] transition-colors"
        >
          Complete Email Verification
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)] font-ui">
      {/* Admin Sidebar */}
      <Sidebar
        title="HORMUZWATCH"
        subtitle="Secure Admin Console"
        logoIcon={Zap}
        navItems={ADMIN_NAV}
        user={{
          name: 'Root Administrator',
          email: env.auth.adminDisplayEmail,
          role: 'Root Admin',
        }}
        onLogout={handleLogout}
        footerContent={
          <div className="p-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)]/60 text-[10px] font-mono text-[var(--color-fg-muted)] space-y-1">
            <div className="flex items-center justify-between">
              <span>ADMIN STATUS</span>
              <span className="text-[var(--color-success)] font-bold">VERIFIED</span>
            </div>
            <div className="w-full bg-[var(--color-border)] h-1 rounded-full overflow-hidden">
              <div className="bg-[var(--color-success)] h-full w-full" />
            </div>
          </div>
        }
      />

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Admin Command Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/80 px-6 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Admin Search: users, system settings, or dataset logs..."
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-4 py-1.5 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle showLabel />
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-1 text-xs font-mono text-[var(--color-success)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
              </span>
              ROOT ADMIN CONSOLE
            </div>

            <Link
              to="/admin/profile"
              className="flex items-center gap-2 border-l border-[var(--color-border)] pl-4 hover:opacity-80 transition-opacity"
              title="View Admin Profile"
            >
              <span className="text-xs font-mono font-semibold text-[var(--color-primary-600)]">
                {env.auth.adminDisplayEmail}
              </span>
            </Link>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
