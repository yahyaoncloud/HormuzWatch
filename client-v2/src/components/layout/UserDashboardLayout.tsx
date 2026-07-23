import {
  Bell,
  Eye,
  Globe,
  Key,
  LayoutDashboard,
  Radio,
  Search,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { Sidebar } from '@/components/ui/sidebar';
import { useAdminStore } from '@/stores';

const USER_NAV = [
  { label: 'User Overview', href: '/user', icon: LayoutDashboard, exact: true },
  { label: 'My Watchlists', href: '/user/watchlists', icon: Eye, badge: '3 Active', badgeColor: 'primary' as const },
  { label: 'Live Telemetry Feed', href: '/user/telemetry', icon: Radio },
  { label: 'Custom Alerts', href: '/user/alerts', icon: Bell, badge: '1 New', badgeColor: 'warning' as const },
  { label: 'API Keys', href: '/user/api-keys', icon: Key },
];

export function UserDashboardLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAdminStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)] font-ui">
      {/* User Sidebar */}
      <Sidebar
        title="HORMUZWATCH"
        subtitle="User Operations Portal"
        logoIcon={Zap}
        navItems={USER_NAV}
        user={{
          name: user?.name || 'Analyst Operator',
          email: user?.email || 'user@hormuzwatch.org',
          role: 'Registered User',
        }}
        onLogout={handleLogout}
        footerContent={
          <div className="p-2 text-center border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)]/60 text-[10px] font-mono text-[var(--color-fg-muted)]">
            <span className="text-[var(--color-success)] font-bold">● LIVE</span> Telemetry Connected
          </div>
        }
      />

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* User Command Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/80 px-6 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search watchlists, tracked vessels, or alerts..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-4 py-1.5 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/intelligence"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
              Public Intelligence
            </Link>

            <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-4">
              <span className="text-xs font-mono font-semibold text-[var(--color-fg)]">
                {user?.email || 'user@hormuzwatch.org'}
              </span>
            </div>
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
