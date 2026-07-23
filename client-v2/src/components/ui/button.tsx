import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

// ============================================================
// Button — shadcn-style, editorial brown theme (self-contained,
// no cva / no radix-slot so it works with the project's deps).
// ============================================================

const VARIANTS: Record<string, string> = {
  default:
    'bg-[var(--color-primary-600)] text-[var(--color-neutral-0)] hover:bg-[var(--color-primary-700)] border border-[var(--color-border)]',
  outline:
    'border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-primary-300)]',
  ghost:
    'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]',
  secondary:
    'bg-[var(--color-neutral-100)] text-[var(--color-neutral-800)] hover:bg-[var(--color-neutral-200)]',
  link: 'text-[var(--color-primary-700)] underline-offset-4 hover:underline',
};

const SIZES: Record<string, string> = {
  default: 'h-10 px-5 text-sm',
  sm: 'h-9 px-4 text-sm',
  lg: 'h-12 px-7 text-base',
  icon: 'h-10 w-10',
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
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-ui font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
          'disabled:pointer-events-none disabled:opacity-50',
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
