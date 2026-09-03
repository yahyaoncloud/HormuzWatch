import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

const VARIANTS: Record<string, string> = {
  default:
    'bg-[#0284c7] text-white hover:bg-[#0369a1] border-t border-l border-white/20 border-r border-b border-black/50 shadow-sm active:translate-y-px',
  outline:
    'border border-[#1f2c40] bg-[#0c1322] text-slate-200 hover:bg-[#162134] hover:border-[#38bdf8]/60 active:translate-y-px',
  ghost:
    'text-slate-400 hover:bg-[#131d2c] hover:text-slate-200',
  secondary:
    'bg-[#131d2c] text-slate-200 hover:bg-[#1c293d] border border-[#1f2c40] active:translate-y-px',
  link: 'text-[#38bdf8] underline-offset-4 hover:underline',
};

const SIZES: Record<string, string> = {
  default: 'h-8 px-3 text-xs font-mono font-semibold uppercase tracking-wider',
  sm: 'h-7 px-2.5 text-[11px] font-mono font-semibold uppercase tracking-wider',
  lg: 'h-9 px-4 text-xs font-mono font-bold uppercase tracking-wider',
  icon: 'h-7 w-7',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-none font-mono font-medium transition-all select-none',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]',
          'disabled:pointer-events-none disabled:opacity-40',
          VARIANTS[variant],
          SIZES[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
