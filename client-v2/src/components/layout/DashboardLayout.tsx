import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Globe,
  LayoutDashboard,
  LogOut,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAdminStore } from '@/stores';
import { cn } from '@/utils/cn';

const DASHBOARD_NAV = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Asset Monitor', href: '/dashboard/assets', icon: Radio },
  { label: 'Threat Center', href: '/dashboard/threats', icon: ShieldAlert },
  { label: 'ML Pipeline', href: '/dashboard/models', icon: Cpu },
  { label: 'System Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAdminStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)] font-ui">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]/90 backdrop-blur-md transition-all duration-300 z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white  shadow-[var(--color-primary)]/20">
              <Zap className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display text-sm font-bold tracking-tight text-[var(--color-fg)] truncate">
                  HORMUZ<span className="text-[var(--color-primary)]">WATCH</span>
                </span>
                <span className="text-[10px] font-mono text-[var(--color-fg-muted)] tracking-wider uppercase">
                  Command Console
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)] transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {DASHBOARD_NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-[var(--color-primary)] text-white  shadow-[var(--color-primary)]/20 font-semibold'
                      : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>

          <div className="my-4 border-t border-[var(--color-border)] px-2 pt-4">
            {!collapsed && (
              <p className="px-2 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                Public Views
              </p>
            )}
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)] transition-all"
            >
              <Globe className="h-5 w-5 shrink-0 text-info" />
              {!collapsed && <span className="truncate">Public Tactical Map</span>}
            </Link>
          </div>
        </div>

        {/* Sidebar Footer Widget */}
        {!collapsed && (
          <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 m-2 rounded-xl border">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-mono text-[var(--color-fg-muted)] flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" /> ML Telemetry
              </span>
              <span className="font-mono font-bold text-success">ONLINE</span>
            </div>
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-success h-full w-[78%] rounded-full animate-pulse" />
            </div>
          </div>
        )}
      </aside>

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Command Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/80 px-6 backdrop-blur-md z-20">
          {/* Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks, alerts, or telemetry logs..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-4 py-1.5 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          </div>

          {/* Right Header Status & User Controls */}
          <div className="flex items-center gap-4">
            {/* Live System Indicator */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-mono text-success">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              SYSTEM NOMINAL
            </div>

            {/* Quick Actions */}
            <Link
              to="/dashboard/threats"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              Threats
            </Link>

            {/* Profile Menu */}
            <div className="flex items-center gap-3 border-l border-[var(--color-border)] pl-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold text-xs">
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-semibold leading-none">{user?.email || 'Commander'}</span>
                  <span className="text-[10px] font-mono text-[var(--color-fg-muted)] mt-0.5">Admin Operator</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-[var(--color-fg-muted)] hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                title="Logout of Portal"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Sub-Route Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
