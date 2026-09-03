import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { Lock, Mail, ShieldAlert, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { adminRegister, isAdminEmail } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { SpinningWireframeGlobe } from '@/components/ui/SpinningWireframeGlobe';

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
      setError('Registration is strictly restricted to designated administrator email addresses.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
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
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060810] text-slate-100 px-4 sm:px-6 overflow-hidden selection:bg-indigo-600 selection:text-white font-ui">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_70%_-10%,rgba(129,140,248,0.18),transparent_70%)] pointer-events-none" />
        
        <div className="absolute -top-32 -right-32 pointer-events-none z-0">
          <SpinningWireframeGlobe size={640} />
        </div>

        <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-indigo-500/25 bg-[#0b111e]/90 shadow-[0_0_60px_-15px_rgba(99,102,241,0.25)] backdrop-blur-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white">Verification Link Dispatched</h2>
          <p className="font-ui text-xs text-slate-400 mt-2 leading-relaxed">
            A confirmation token has been dispatched to <strong className="text-indigo-300 font-mono">{email}</strong>. Please complete the verification step to activate root console credentials.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="mt-6 h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-ui text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Return to Command Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060810] text-slate-100 px-4 sm:px-6 overflow-hidden selection:bg-indigo-600 selection:text-white font-ui">
      {/* Dynamic Background Mesh & Ambient Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_70%_-10%,rgba(129,140,248,0.18),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP RIGHT CORNER: Spinning 2 Outlined Dual Wireframe Globe (~60% Revealed) */}
      <div className="absolute -top-32 -right-32 sm:-top-28 sm:-right-28 lg:-top-32 lg:-right-32 pointer-events-none z-0">
        <SpinningWireframeGlobe size={640} />
      </div>

      {/* Refined Registration Form Container */}
      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-indigo-500/25 bg-[#0b111e]/90 shadow-[0_0_60px_-15px_rgba(99,102,241,0.25)] backdrop-blur-2xl p-7 sm:p-9 overflow-hidden">
        {/* Top Glowing Indigo Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/90 to-transparent" />

        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link
            to="/"
            className="group mb-4 inline-flex items-center gap-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-2 pr-3.5 shadow-[0_0_20px_rgba(129,140,248,0.2)] transition-all hover:border-indigo-400/60"
            aria-label="Return to HormuzWatch Public Map"
          >
            <img
              src="/apple-touch-icon.png"
              alt="HormuzWatch Logo"
              className="w-7 h-7 rounded-lg object-contain"
            />
            <span className="font-display text-sm font-bold tracking-wider text-slate-200 uppercase">
              HormuzWatch
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400" />
            </span>
            AUTHORIZED PROVISIONING
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Register Admin Account
          </h1>
          <p className="font-ui text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Provision elevated operator credentials for the tactical intelligence console.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="flex items-center justify-between font-ui text-xs font-medium text-slate-300">
              <span>Admin Email</span>
              <span className="font-mono text-[10px] text-slate-500">Designated Only</span>
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-800 bg-[#070b14]/90 pl-10 pr-3.5 font-ui text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-indigo-400 focus:bg-[#090f1d] focus:ring-2 focus:ring-indigo-400/25"
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center justify-between font-ui text-xs font-medium text-slate-300">
              <span>Password</span>
              <span className="font-mono text-[10px] text-slate-500">Min 8 chars</span>
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-800 bg-[#070b14]/90 pl-10 pr-3.5 font-ui text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-indigo-400 focus:bg-[#090f1d] focus:ring-2 focus:ring-indigo-400/25"
                placeholder="••••••••••••"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center justify-between font-ui text-xs font-medium text-slate-300">
              <span>Confirm Password</span>
              <span className="font-mono text-[10px] text-slate-500">Verification</span>
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-800 bg-[#070b14]/90 pl-10 pr-3.5 font-ui text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-indigo-400 focus:bg-[#090f1d] focus:ring-2 focus:ring-indigo-400/25"
                placeholder="••••••••••••"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-ui text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Provisioning Account…</span>
              </>
            ) : (
              <>
                <span>Create Administrator Account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <span>Already have root credentials? </span>
          <Link
            to="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors underline-offset-2 hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
