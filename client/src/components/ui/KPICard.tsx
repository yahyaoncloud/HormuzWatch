import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface KPICardProps {
  icon: ReactNode | ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  iconColor?: string;
  valueColor?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string | number;
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  icon: Icon,
  value,
  label,
  iconColor = 'var(--color-primary-600)',
  valueColor = 'var(--color-fg)',
  trend,
  trendValue,
  className,
  onClick,
}: KPICardProps) {
  const renderIcon = () => {
    if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null && '$$typeof' in Icon && !('props' in Icon))) {
      const IconComp = Icon as ComponentType<{ className?: string }>;
      return <IconComp className="h-5 w-5" />;
    }
    return Icon as ReactNode;
  };

  return (
    <div
      className={cn(
        'glass-card rounded-md p-5 border border-[var(--color-border)] flex items-center justify-between transition-all',
        onClick && 'cursor-pointer hover:border-[var(--color-primary-600)]/50',
        className
      )}
      onClick={onClick}
    >
      <div className="w-full">
        <div className="flex items-center justify-between">
          <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">{label}</span>
          <span style={{ color: iconColor }}>{renderIcon()}</span>
        </div>
        <div className="font-mono text-2xl font-bold mt-2" style={{ color: valueColor }}>
          {value}
        </div>
        {trend && trendValue !== undefined && (
          <span
            className={cn(
              'font-ui text-[11px] font-bold mt-1 inline-block',
              trend === 'up' && 'text-[var(--color-success)]',
              trend === 'down' && 'text-[var(--color-danger)]',
              trend === 'stable' && 'text-[var(--color-fg-muted)]'
            )}
          >
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

interface KPICardGridProps {
  cards: KPICardProps[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function KPICardGrid({ cards, columns = 4, className }: KPICardGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {cards.map((card, idx) => (
        <KPICard key={idx} {...card} />
      ))}
    </div>
  );
}