import { useAdminStore } from "@/stores";
import { env } from "@/environments/environment";
import { User, Key, ShieldCheck, Laptop, Copy, RefreshCw, Check } from "lucide-react";
import { useState } from "react";

export default function AdminProfile() {
  const { user } = useAdminStore();
  const [copiedToken, setCopiedToken] = useState(false);
  const [apiToken, setApiToken] = useState("hw_live_root_9a8f7b3c2d1e405a6b7c8d9e");
  const [passwordState, setPasswordState] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleRegenerateToken = () => {
    const newToken = "hw_live_root_" + Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    setApiToken(newToken);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordState.newPass && passwordState.newPass === passwordState.confirm) {
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
      setPasswordState({ current: "", newPass: "", confirm: "" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Admin Profile & Security</h1>
        <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
          Manage root administrator credentials, active session security, and API authentication tokens.
        </p>
      </div>

      {/* Identity Banner */}
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-md bg-[var(--color-primary-600)]/20 border border-[var(--color-primary-600)]/40 flex items-center justify-center text-[var(--color-primary-600)] font-bold text-2xl">
            <User className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-[var(--color-fg)]">{user?.name || "Root Administrator"}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30">
                VERIFIED SESSION
              </span>
            </div>
            <p className="font-mono text-xs text-[var(--color-fg-muted)] mt-0.5">{env.auth.adminDisplayEmail}</p>
            <p className="font-ui text-xs text-[var(--color-fg-muted)] mt-1">Role: SuperAdmin &bull; Full Access</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Card */}
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Key className="h-5 w-5 text-[var(--color-primary-600)]" />
            <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Change Master Password</h3>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-ui text-[var(--color-fg-muted)] mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordState.current}
                onChange={(e) => setPasswordState(prev => ({ ...prev, current: e.target.value }))}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-ui text-[var(--color-fg-muted)] mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwordState.newPass}
                onChange={(e) => setPasswordState(prev => ({ ...prev, newPass: e.target.value }))}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-ui text-[var(--color-fg-muted)] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordState.confirm}
                onChange={(e) => setPasswordState(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>
            {passwordSaved && (
              <div className="p-2 rounded bg-[var(--color-success)]/15 text-[var(--color-success)] text-xs font-ui flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Password updated successfully.
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-ui text-xs font-semibold rounded-lg transition-colors"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* API Token Management */}
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[var(--color-primary-600)]" />
                <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Admin API Key</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
                HIGH PRIVILEGE
              </span>
            </div>
            <p className="text-xs text-[var(--color-fg-muted)] font-ui">
              Use this key to authenticate programmatic requests to the HormuzWatch Admin REST API.
            </p>
            <div className="space-y-1">
              <label className="block text-[11px] font-mono text-[var(--color-fg-muted)]">Active Secret Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiToken}
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg-muted)] select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-border)]/40 text-[var(--color-fg)] transition-colors"
                  title="Copy Key"
                >
                  {copiedToken ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerateToken}
            className="w-full py-2 border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-fg)] font-ui text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate API Secret
          </button>
        </div>
      </div>

      {/* Active Session Info */}
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <Laptop className="h-5 w-5 text-[var(--color-primary-600)]" />
          <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Active Login Sessions</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="flex items-center gap-3">
              <Laptop className="h-5 w-5 text-[var(--color-success)]" />
              <div>
                <p className="text-xs font-semibold font-ui text-[var(--color-fg)]">Current Active Session (This Device)</p>
                <p className="text-[11px] font-mono text-[var(--color-fg-muted)]">IP: 127.0.0.1 &bull; Chrome on Windows</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-success)]/20 text-[var(--color-success)] font-semibold">
              ACTIVE NOW
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
