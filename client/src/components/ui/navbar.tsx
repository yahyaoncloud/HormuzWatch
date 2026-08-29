import { type ReactNode } from 'react';
import { Link, useNavigation } from 'react-router';
import { cn } from '@/utils/cn';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  transparent?: boolean;
  children?: ReactNode;
}

export function Navbar({ transparent = false, children }: NavbarProps) {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  return (
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
        className="flex items-center gap-2 shrink-0 group text-[var(--color-fg)]"
        aria-label="HormuzWatch Home"
      >
        <img
          src="/apple-touch-icon.png"
          alt="HormuzWatch Logo"
          className="w-6 h-6 rounded-md object-contain transition-transform group-hover:scale-105"
        />
        <span className="font-display text-lg font-semibold tracking-tight">HormuzWatch</span>
      </Link>

      {/* Right-aligned Actions & Controls */}
      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle className="ml-2" />
        {children}
      </div>

      {isLoading && (
        <div className="absolute bottom-0 left-0 h-[1.5px] bg-[var(--color-primary-500)] w-full animate-pulse z-50" />
      )}
    </header>
  );
}
