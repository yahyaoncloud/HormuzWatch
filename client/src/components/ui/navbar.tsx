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
          className="flex items-center gap-2 shrink-0 group text-[var(--color-fg)]"
          aria-label="HormuzWatch Home"
        >
          <div className="w-6 h-6 border border-[var(--color-border-strong)] bg-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-primary-600)] dark:text-[#38bdf8] text-xs font-mono font-bold shadow-inner">
            HW
          </div>
          <span className="font-mono text-sm font-bold tracking-wider uppercase text-[var(--color-fg)]">
            HORMUZ<span className="text-[var(--color-primary-600)] dark:text-[#38bdf8]">WATCH</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[10px] font-mono font-semibold tracking-wider text-[var(--color-fg-muted)]">
          <Shield className="w-3 h-3 text-[var(--color-primary-600)] dark:text-[#38bdf8]" />
          <span>TAC-INTEL CONSOLE // SECTOR 56-59°E</span>
        </div>
      </div>

      {/* Center Tactical Clock Readout */}
      <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-[var(--color-fg-muted)]">
        <span className="inline-block w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_4px_#22c55e]"></span>
        <span className="text-[var(--color-fg-subtle)]">SYS.TIME:</span>
        <span className="text-[var(--color-primary-600)] dark:text-[#38bdf8] font-bold tracking-wider">{utcTime || '00:00:00Z'}</span>
      </div>

      {/* Right-aligned Actions & Controls */}
      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle className="ml-1" />
        {children}
      </div>

      {isLoading && (
        <div className="absolute bottom-0 left-0 h-[2px] bg-[#38bdf8] w-full animate-pulse z-50" />
      )}
    </header>
  );
}
