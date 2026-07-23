import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { adminRegister, isAdminEmail } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import loginBg from '@/assets/login_background.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAdminEmail(email)) {
      setError('Registration is restricted to authorized administrator emails.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setBusy(true);
    try {
      await adminRegister(email, password);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-6"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-800/60 pointer-events-none" />
        <Card className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-bg-card)]/95 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="font-display text-xl font-semibold text-[var(--color-fg)]">Check your email</CardTitle>
            <CardDescription className="font-ui text-sm text-[var(--color-fg-muted)]">
              A confirmation link has been sent to <strong>{email}</strong>. Please verify your email to activate your admin account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => navigate('/login')}
              className="h-10 font-medium"
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-6"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-800/60 pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-bg-card)]/95 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6" aria-label="HormuzWatch Home">
            <svg className="w-8 h-8 text-[var(--color-primary-600)]" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="M16 6v12M10 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="16" r="4" fill="var(--color-primary-600)" />
            </svg>
            <span className="font-display text-xl font-semibold tracking-tight text-[var(--color-fg)]">HormuzWatch</span>
          </Link>
          <CardTitle className="font-display text-xl font-semibold text-[var(--color-fg)]">Admin Registration</CardTitle>
          <CardDescription className="font-ui text-sm text-[var(--color-fg-muted)]">
            Restricted to authorized administrator accounts
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
                placeholder="you@example.com"
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
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-ui text-sm text-[var(--color-fg-muted)]">
              Confirm Password
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)]/80 px-3 font-ui text-[var(--color-fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] transition-all"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
            {error && <p className="font-ui text-xs text-[var(--color-danger)] mt-1">{error}</p>}
            <Button type="submit" disabled={busy} className="mt-2 h-10 font-medium">
              {busy ? 'Creating account…' : 'Create Admin Account'}
            </Button>
          </form>
          <p className="mt-6 text-center font-ui text-sm text-[var(--color-fg-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[var(--color-primary-600)] hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
