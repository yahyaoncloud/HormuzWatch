import { Menu, X } from 'lucide-react';
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
    { href: '/learn', label: 'Documentation' },
    { href: '/about', label: 'About' },
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
            'flex items-center gap-2 shrink-0',
            transparent ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg)]'
          )}
          aria-label="HormuzWatch Home"
        >
          <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M16 6v12M10 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="4" fill="var(--color-primary-600)" />
          </svg>
          <span className="font-display text-lg font-semibold tracking-tight">HormuzWatch</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5" aria-label="Primary navigation">
          {navLinks.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2.5 py-1.5 font-ui text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <ThemeToggle className="ml-1" />
          {children}
        </nav>

        {/* Mobile hamburger */}
        <button
          ref={buttonRef}
          type="button"
          className={cn(
            'md:hidden rounded-md p-1.5 transition-colors',
            transparent
              ? 'text-[var(--color-fg)] hover:bg-[var(--color-fg)]/10'
              : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]'
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
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100vh-4rem)] overflow-y-auto border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg"
          >
            <ul className="py-1.5 space-y-0.5" aria-label="Navigation links">
              {children && (
                <div className="border-b border-[var(--color-border)] mx-2 px-3 py-2 mb-1">{children}</div>
              )}
              {navLinks.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      cn(
                        'block mx-2 px-3 py-2 font-ui text-sm font-medium transition-colors rounded-md',
                        isActive
                          ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                          : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <div className="px-2 pt-1.5 border-t border-[var(--color-border)]">
                <ThemeToggle showLabel className="w-full justify-center" />
              </div>
            </ul>
          </div>
        </>
      )}
    </>
  );
}
