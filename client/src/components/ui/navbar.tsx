import { type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigation } from 'react-router';
import { cn } from '@/utils/cn';
import { ThemeToggle } from './ThemeToggle';
import { Shield } from 'lucide-react';

interface NavbarProps {
  transparent?: boolean;
  children?: ReactNode;
}

export function Navbar({ transparent = false, children }: NavbarProps) {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + 'Z');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-11 items-center justify-between px-3 sm:px-4 border-b border-[var(--color-border)] tactical-header-strip select-none',
        transparent ? 'bg-transparent' : 'bg-[var(--color-bg-elevated)]'
      )}
      role="banner"
    >
      {/* Tactical Logo & System Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 group text-[var(--color-fg)]"
          aria-label="HormuzWatch Home"
        >
          {/* Main Tactical Radar Logo Emblem */}
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="HormuzWatch Logo"
              className="w-full h-full object-contain rounded-full drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]"
            />
          </div>
          {/* Capital Widefont Text Logo */}
          <span className="font-wide text-xs sm:text-[13px] font-extrabold uppercase text-[var(--color-fg)] select-none">
            HORMUZ<span className="text-[var(--color-primary-600)] dark:text-[#38bdf8]">WATCH</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[10px] font-mono font-semibold tracking-wider text-[var(--color-fg-muted)]">
          <Shield className="w-3 h-3 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          <span>TAC-INTEL CONSOLE // SECTOR 56-59°E</span>
        </div>
      </div>

      {/* Right-aligned Actions & Controls with Far-Right SYS.TIME */}
      <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
        <ThemeToggle className="ml-1" />
        {children}

        {/* Far-Right Tactical UTC Clock Readout */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-card)] font-mono text-[11px] text-[var(--color-fg-muted)] shrink-0 select-none shadow-xs">
          <span className="inline-block w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_4px_#22c55e] animate-pulse"></span>
          <span className="text-[var(--color-fg-subtle)] font-semibold text-[10px]">SYS.TIME:</span>
          <span className="text-[var(--color-primary-600)] dark:text-[#38bdf8] font-bold tracking-wider font-mono">{utcTime || '00:00:00Z'}</span>
        </div>
      </div>

      {isLoading && (
        <div className="absolute bottom-0 left-0 h-[2px] bg-[#38bdf8] w-full animate-pulse z-50" />
      )}
    </header>
  );
}
