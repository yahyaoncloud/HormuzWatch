import { ChevronLeft, ChevronRight, LogOut, LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { cn } from '@/utils/cn';

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string | number;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
}

export interface SidebarProps {
  title: string;
  subtitle?: string;
  logoIcon?: LucideIcon;
  navItems: SidebarNavItem[];
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  };
  onLogout?: () => void;
  className?: string;
  footerContent?: React.ReactNode;
}

export function Sidebar({
  title,
  subtitle,
  logoIcon: LogoIcon,
  navItems,
  user,
  onLogout,
  className,
  footerContent,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] transition-all duration-150 z-30 shrink-0 h-full',
        collapsed ? 'w-[52px]' : 'w-60',
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-3 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
          {LogoIcon ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary-600)] text-white">
              <LogoIcon className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary-600)] text-white font-bold font-mono text-[11px]">
              HW
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-display text-[13px] font-bold tracking-tight text-[var(--color-fg)] truncate">
                {title}
              </span>
              {subtitle && (
                <span className="text-[9px] font-mono text-[var(--color-fg-muted)] tracking-wider uppercase truncate">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)] transition-colors shrink-0"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-ui font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-primary-600)] text-white font-semibold'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
              )
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </div>
            {!collapsed && item.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0',
                  item.badgeColor === 'primary' && 'bg-white/20 text-white',
                  item.badgeColor === 'success' && 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
                  item.badgeColor === 'danger' && 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
                  (!item.badgeColor || item.badgeColor === 'warning') && 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                )}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Optional Custom Footer Content */}
      {!collapsed && footerContent && (
        <div className="px-2 py-2 border-t border-[var(--color-border)]">{footerContent}</div>
      )}

      {/* User Profile Footer */}
      {user && (
        <div className="p-2.5 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/admin/profile"
              className="flex items-center gap-2 min-w-0 hover:opacity-85 transition-opacity flex-1 group"
              title="View Admin Profile"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] font-bold text-[11px] group-hover:bg-[var(--color-primary-600)] group-hover:text-white transition-colors">
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-primary-600)] transition-colors truncate">
                    {user.name || user.email}
                  </span>
                  {user.role && (
                    <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase truncate">
                      {user.role}
                    </span>
                  )}
                </div>
              )}
            </Link>
            {onLogout && !collapsed && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] transition-colors rounded-md hover:bg-[var(--color-danger)]/10 shrink-0"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
