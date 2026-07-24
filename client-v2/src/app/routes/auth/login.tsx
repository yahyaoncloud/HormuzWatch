import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import loginBg from '@/assets/login_background.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { adminLogin } from '@/lib/auth';
import { useAdminStore } from '@/stores';

export default function LoginRoute() {
  const navigate = useNavigate();
  const setSession = useAdminStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const data = await adminLogin(email, password);
      // Wire the Supabase session into the admin store immediately so
      // the route guard reads isAuthenticated / isVerified without
      // waiting for the SupabaseAuthProvider's async hydration.
      if (data.session) {
        setSession(data.session);
      }
      navigate('/admin');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-6"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* light gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-100/50 to-zinc-800/10 pointer-events-none" />

      <Card className="relative z-10 w-full max-w-sm rounded-md border border-[var(--color-border)]/60 bg-[var(--color-bg-card)]/95 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6" aria-label="HormuzWatch Home">
            <svg className="w-8 h-8 text-[var(--color-primary-600)]" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="M16 6v12M10 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="16" r="4" fill="var(--color-primary-600)" />
            </svg>
            <span className="font-display text-xl font-semibold tracking-tight text-[var(--color-fg)]">HormuzWatch</span>
          </Link>
          <CardTitle className="font-display text-xl font-semibold text-[var(--color-fg)]">Admin Sign In</CardTitle>
          <CardDescription className="font-ui text-sm text-[var(--color-fg-muted)]">
            Secure console access for authorized administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-ui text-sm text-[var(--color-fg-muted)]">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)]/80 px-3 font-ui text-[var(--color-fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] transition-all"
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-ui text-sm text-[var(--color-fg-muted)]">
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)]/80 px-3 font-ui text-[var(--color-fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            {error && <p className="font-ui text-xs text-[var(--color-danger)] mt-1">{error}</p>}
            <Button type="submit" disabled={busy} className="mt-2 h-10 font-medium">
              {busy ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-6 text-center font-ui text-sm text-[var(--color-fg-muted)]">
            Need an admin account?{' '}
            <Link to="/register" className="font-medium text-[var(--color-primary-600)] hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
