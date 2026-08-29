import { IntelligenceDashboard } from '@/components/intelligence/IntelligenceDashboard';
import { DesktopOnlyOverlay } from '@/components/ui/DesktopOnlyOverlay';

export async function clientLoader() {
  return {};
}

export default function IntelligencePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Mobile view desktop overlay blocker */}
      <DesktopOnlyOverlay title="Intelligence Center Console" subtitle="Desktop View Required" />

      {/* Page header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <span className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">Intelligence Center</span>
        </div>
      </div>
      <IntelligenceDashboard />
    </div>
  );
}
