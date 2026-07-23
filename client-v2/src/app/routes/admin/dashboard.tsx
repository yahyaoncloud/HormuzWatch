import { CheckCircle2, Cpu, Database, UserCheck, Users, XCircle } from 'lucide-react';
import { Section } from '@/components/layout/Section';

export default function AdminDashboard() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/90 p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] animate-pulse" />
                SECURE ROOT ADMIN CONSOLE
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-fg)] mt-2">
              Admin System Control Panel
            </h1>
            <p className="font-ui text-xs sm:text-sm text-[var(--color-fg-muted)] mt-1 max-w-xl">
              Root administrator console for user approval queues, site retention rules, automated GDrive datasets, and ML model overrides.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">Pending Approvals</span>
            <Users className="h-4 w-4 text-[var(--color-danger)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-danger)] mt-2">2 Users</div>
          <span className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-1 inline-block">Requires Action</span>
        </div>

        <div className="glass-card rounded-xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">Total Users</span>
            <UserCheck className="h-4 w-4 text-[var(--color-success)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-fg)] mt-2">48</div>
          <span className="font-ui text-[11px] text-[var(--color-success)] mt-1 inline-block">44 Active Operators</span>
        </div>

        <div className="glass-card rounded-xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">Dataset Retention</span>
            <Database className="h-4 w-4 text-[var(--color-primary-600)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-fg)] mt-2">30 Days</div>
          <span className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-1 inline-block">GDrive Snapshots</span>
        </div>

        <div className="glass-card rounded-xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">ML Pipeline</span>
            <Cpu className="h-4 w-4 text-[var(--color-success)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--color-success)] mt-2">99.8%</div>
          <span className="font-ui text-[11px] text-[var(--color-fg-muted)] mt-1 inline-block">Model Latency: 247ms</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="User Approval Queue" subtitle="New operator registration requests">
          <div className="glass-card rounded-xl p-4 border border-[var(--color-border)] space-y-3">
            {[
              { name: 'johndoe_analyst', email: 'johndoe@navy.mil', date: 'Today, 14:20' },
              { name: 'maritime_watcher', email: 'watcher@shipping.org', date: 'Yesterday, 09:45' },
            ].map((req, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40 text-xs">
                <div>
                  <div className="font-semibold text-[var(--color-fg)]">{req.name}</div>
                  <div className="font-mono text-[11px] text-[var(--color-fg-muted)]">{req.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="p-1.5 bg-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/30 rounded-lg transition-colors" title="Approve User">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button type="button" className="p-1.5 bg-[var(--color-danger)]/20 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/30 rounded-lg transition-colors" title="Reject / Blacklist User">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Threat Policy Overrides" subtitle="Global security threshold controls">
          <div className="glass-card rounded-xl p-4 border border-[var(--color-border)] space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40">
              <div>
                <div className="font-semibold text-[var(--color-fg)]">AIS Dropout Watchdog</div>
                <div className="text-[11px] text-[var(--color-fg-muted)]">Auto-flag transponder gaps exceeding 15 mins</div>
              </div>
              <span className="font-mono text-[10px] font-bold px-2 py-1 bg-[var(--color-success)]/20 text-[var(--color-success)] rounded-full">ENABLED</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/40">
              <div>
                <div className="font-semibold text-[var(--color-fg)]">Auto-Watchlist Sensitivity Threshold</div>
                <div className="text-[11px] text-[var(--color-fg-muted)]">Trigger score threshold: 75/100</div>
              </div>
              <span className="font-mono text-[10px] font-bold px-2 py-1 bg-[var(--color-primary-600)]/20 text-[var(--color-primary-600)] rounded-full">75 SCORE</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
