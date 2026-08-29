import { BookOpen, Info, Menu, Radio, ShieldAlert, X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigation } from 'react-router';
import { cn } from '@/utils/cn';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  transparent?: boolean;
  children?: ReactNode;
}

export function Navbar({ transparent = false, children }: NavbarProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const dropdown = dropdownRef.current;
    if (!dropdown) return;

    const focusable = dropdown.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    dropdown.addEventListener('keydown', handleTab);
    first?.focus();
    return () => dropdown.removeEventListener('keydown', handleTab);
  }, [mobileOpen]);

  const navLinks = [
    { href: '/', label: 'Live Ops', icon: Radio, end: true },
    { href: '/intelligence', label: 'Intelligence', icon: ShieldAlert },
    { href: '/learn', label: 'Documentation', icon: BookOpen },
    { href: '/about', label: 'About', icon: Info },
  ];

  const openMenu = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    if (!mobileOpen) return;
    setMobileOpen(false);
    buttonRef.current?.focus();
  }, [mobileOpen]);

  const toggleMenu = useCallback(() => {
    if (mobileOpen) closeMenu();
    else openMenu();
  }, [mobileOpen, closeMenu, openMenu]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 flex h-12 items-center justify-between px-4 sm:px-6 transition-all duration-150',
          transparent
            ? 'bg-transparent'
            : 'border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm'
        )}
        role="banner"
      >
        {/* Logo */}
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2 shrink-0 group',
            transparent ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg)]'
          )}
          aria-label="HormuzWatch Home"
        >
          <img src="/apple-touch-icon.png" alt="HormuzWatch Logo" className="w-6 h-6 rounded-md object-contain transition-transform group-hover:scale-105" />
          <span className="font-display text-lg font-semibold tracking-tight">HormuzWatch</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0 border border-[var(--color-border)] divide-x divide-[var(--color-border)] rounded-none" aria-label="Primary navigation">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1 font-ui text-xs font-medium transition-all duration-150 rounded-none h-7.5',
                    isActive
                      ? 'bg-primary-500/15 text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] font-semibold'
                      : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]'
                  )
                }
              >
                <Icon className="h-3.5 w-3.5 opacity-80 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="ml-2" />
          {children}
        </div>

        {/* Mobile hamburger */}
        <button
          ref={buttonRef}
          type="button"
          className={cn(
            'md:hidden rounded-md p-1.5 transition-colors border border-transparent',
            transparent
              ? 'text-[var(--color-fg)] hover:bg-[var(--color-fg)]/10'
              : 'text-[var(--color-fg-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]'
          )}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-dropdown"
          onClick={toggleMenu}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {isLoading && (
          <div className="absolute bottom-0 left-0 h-[1.5px] bg-[var(--color-primary-500)] w-full animate-pulse z-50" />
        )}
      </header>

      {/* Mobile dropdown + overlay */}
      {mobileOpen && (
        <>
          <div
            ref={overlayRef}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            ref={dropdownRef}
            id="mobile-dropdown"
            role="navigation"
            aria-label="Mobile navigation"
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100vh-4rem)] overflow-y-auto border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg rounded-none divide-y divide-[var(--color-border)]"
          >
            {children && (
              <div className="p-2">{children}</div>
            )}
            <ul className="divide-y divide-[var(--color-border)]" aria-label="Navigation links">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.end}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 px-4 py-2.5 font-ui text-xs font-medium transition-all rounded-none',
                          isActive
                            ? 'bg-primary-500/15 text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] font-semibold'
                            : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 opacity-80 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
            <div className="p-2 border-t border-[var(--color-border)]">
              <ThemeToggle showLabel className="w-full justify-center rounded-none" />
            </div>
          </div>
        </>
      )}
    </>
  );
}
