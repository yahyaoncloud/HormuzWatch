import { Sun, Moon, Laptop } from "lucide-react";
import { useSettingsStore } from "@/stores";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useSettingsStore();

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const getIcon = () => {
    if (theme === "light") return <Sun className="h-4 w-4 text-indigo-500 transition-all" />;
    if (theme === "dark") return <Moon className="h-4 w-4 text-indigo-300 transition-all" />;
    return <Laptop className="h-4 w-4 text-[var(--color-primary-600)] transition-all" />;
  };

  const getTitle = () => {
    if (theme === "light") return "Theme: Light (Click to switch to System)";
    if (theme === "dark") return "Theme: Dark (Click to switch to Light)";
    return "Theme: System (Click to switch to Dark)";
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={getTitle()}
      aria-label="Toggle Theme Mode"
      className={`flex items-center gap-2 rounded-lg p-2 font-ui text-xs font-medium transition-colors border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-fg)] ${className}`}
    >
      {getIcon()}
      {showLabel && (
        <span className="capitalize font-mono text-[11px] text-[var(--color-fg-muted)]">
          {theme} Mode
        </span>
      )}
    </button>
  );
}
