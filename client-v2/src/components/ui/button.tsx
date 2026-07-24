import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

const VARIANTS: Record<string, string> = {
  default:
    'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] border border-transparent',
  outline:
    'border border-[var(--color-border)] bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]',
  ghost:
    'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]',
  secondary:
    'bg-[var(--color-bg-elevated)] text-[var(--color-fg)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)]',
  link: 'text-[var(--color-primary-600)] underline-offset-4 hover:underline',
};

const SIZES: Record<string, string> = {
  default: 'h-9 px-3.5 text-[13px]',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-10 px-5 text-sm',
  icon: 'h-8 w-8',
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
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-ui font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[var(--color-primary-600)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)]',
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
