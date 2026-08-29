import { useLayoutEffect } from 'react';
import { useSettingsStore } from '@/stores';

// ============================================================
// Theme application (persists across public and admin routes)
// ============================================================

function useApplyTheme() {
  const theme = useSettingsStore((s) => s.theme);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mql.matches);
      root.classList.toggle('dark', isDark);
    };
    apply();
    if (theme === 'system') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [theme]);
}

// ============================================================
// App Component — routing is handled by React Router v8
// file-based routing (app/routes.ts). This component only
// applies the persisted theme.
// ============================================================

export function App() {
  useApplyTheme();
  return null;
}
