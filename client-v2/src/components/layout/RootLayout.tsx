import { Link, Outlet } from 'react-router';
import { Navbar } from '@/components/ui/navbar';
import { SiteFooter } from './SiteFooter';

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Navbar>
        <Link
          to="/login"
          className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2 font-ui text-sm font-medium transition-colors text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]"
        >
          Login
        </Link>
      </Navbar>
      <main id="main-content" className="relative flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
