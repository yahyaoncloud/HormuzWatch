import { cn } from '@/utils/cn';

export function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-[var(--color-bg-elevated)]">
      <span className="min-w-0">
        <span className="block font-ui text-sm font-medium text-[var(--color-fg)]">{label}</span>
        <span className="mt-0.5 block font-ui text-xs text-[var(--color-fg-muted)]">
          {description}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--color-primary-600)]' : 'bg-[var(--color-neutral-300)]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
