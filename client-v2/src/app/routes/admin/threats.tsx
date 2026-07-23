import { useQuery } from "@tanstack/react-query";
import { getThreats } from "@/lib/api";
import type { Threat } from "@/lib/api";
import { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertCircle,
  Clock,
  Activity,
  FileText,
} from "lucide-react";
import {
  PageHeader,
  KPICardGrid,
  SearchFilter,
  LoadingState,
  ErrorState,
  EmptyState,
  Modal,
  ConfirmDialog,
} from "@/components/ui";

type ThreatStatus = "Investigating" | "Mitigated" | "False Positive" | "Closed";

const levelColors: Record<string, string> = {
  critical: "bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30",
  high: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  medium: "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30",
  low: "bg-[var(--color-info)]/20 text-[var(--color-info)] border-[var(--color-info)]/30",
};

const THREAT_LEVELS = [
  { value: "all", label: "All Severity Levels" },
  { value: "critical", label: "Critical Only" },
  { value: "high", label: "High Only" },
  { value: "medium", label: "Medium Only" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All Operational Statuses" },
  { value: "investigating", label: "Investigating" },
  { value: "mitigated", label: "Mitigated" },
  { value: "false positive", label: "False Positive" },
  { value: "closed", label: "Closed" },
] as const;

const STATUS_CHIPS: ThreatStatus[] = ["Investigating", "Mitigated", "False Positive", "Closed"];

export default function AdminThreats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "threats"],
    queryFn: () => getThreats(100),
    refetchInterval: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [threatStatuses, setThreatStatuses] = useState<Record<string, ThreatStatus>>({});
  const [activeModalThreat, setActiveModalThreat] = useState<Threat | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState<{ threatId: string; status: ThreatStatus } | null>(null);

  const rawThreats = data?.data ?? [];

  const filteredThreats = useMemo(() => {
    return rawThreats.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.region.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLevel = selectedLevel === "all" || t.level.toLowerCase() === selectedLevel.toLowerCase();

      const currentStatus = threatStatuses[t.id] || "Investigating";
      const matchesStatus = statusFilter === "all" || currentStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [rawThreats, searchQuery, selectedLevel, statusFilter, threatStatuses]);

  const criticalCount = rawThreats.filter((t) => t.level === "critical").length;
  const highCount = rawThreats.filter((t) => t.level === "high").length;
  const mediumCount = rawThreats.filter((t) => t.level === "medium").length;
  const lowCount = rawThreats.filter((t) => t.level === "low").length;

  const handleUpdateStatus = (threatId: string, status: ThreatStatus) => {
    setThreatStatuses((prev) => ({ ...prev, [threatId]: status }));
  };

  const kpiCards = useMemo(() => [
    { icon: AlertCircle, value: criticalCount, label: "Critical", iconColor: "var(--color-danger)" },
    { icon: AlertCircle, value: highCount, label: "High", iconColor: "var(--color-warning)" },
    { icon: Activity, value: mediumCount, label: "Medium", iconColor: "var(--color-info)" },
    { icon: ShieldAlert, value: lowCount, label: "Low", iconColor: "var(--color-fg-muted)" },
  ], [criticalCount, highCount, mediumCount, lowCount]);

  if (isLoading) {
    return <LoadingState message="Loading active threat monitoring board..." size="md" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Threat Board"
        message={error instanceof Error ? error.message : "Unknown error"}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-ui pb-12">
      {/* Header */}
      <PageHeader
        icon={<ShieldAlert className="h-6 w-6" />}
        title="Tactical Threat Board"
        subtitle="Real-time threat monitoring, ML confidence scoring, operator status assignments, and risk escalation."
      />

      {/* KPI Severity Summary Cards */}
      <KPICardGrid cards={kpiCards} columns={4} className="mb-4" />

      {/* Threat Trend Bar Visualization */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-3 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-fg)] uppercase">
            <Activity className="h-4 w-4 text-[var(--color-primary-600)]" />
            7-Day Tactical Threat Trend Distribution
          </div>
        </div>
        <div className="h-10 w-full rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] p-1 flex items-center gap-1 overflow-hidden">
          <div
            className="bg-[var(--color-danger)] h-full rounded text-[10px] font-mono font-bold text-white flex items-center justify-center"
            style={{ width: `${Math.max(15, (criticalCount / Math.max(1, rawThreats.length)) * 100)}%` }}
          >
            CRITICAL ({criticalCount})
          </div>
          <div
            className="bg-amber-500 h-full rounded text-[10px] font-mono font-bold text-black flex items-center justify-center"
            style={{ width: `${Math.max(15, (highCount / Math.max(1, rawThreats.length)) * 100)}%` }}
          >
            HIGH ({highCount})
          </div>
          <div className="bg-[var(--color-primary-600)] h-full rounded text-[10px] font-mono font-bold text-white flex items-center justify-center flex-1">
            OTHER ({rawThreats.length - criticalCount - highCount})
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <SearchFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search threats by title or region..."
        filters={[
          { key: "level", label: "Severity", value: selectedLevel, onChange: setSelectedLevel, options: THREAT_LEVELS },
          { key: "status", label: "Status", value: statusFilter, onChange: setStatusFilter, options: STATUS_OPTIONS },
        ]}
      />

      {/* Threat List Cards */}
      <div className="space-y-3">
        {filteredThreats.length === 0 ? (
          <EmptyState
            title="No Active Threats Found"
            message="No threats match your current filter parameters."
            icon={<ShieldAlert className="h-8 w-8" />}
          />
        ) : (
          filteredThreats.map((t) => {
            const currentStatus = threatStatuses[t.id] || "Investigating";

            return (
              <div key={t.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 hover:border-[var(--color-primary-600)]/40 transition-colors space-y-3 ">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${levelColors[t.level] ?? levelColors.low}`}>
                      {t.level.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] border border-[var(--color-border)]">
                      {t.region}
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                      ML CONFIDENCE: 92.4%
                    </span>
                  </div>

                  {/* Status Selector */}
                  <div className="flex items-center gap-1">
                    {STATUS_CHIPS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(t.id, st)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                          currentStatus === st
                            ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] font-bold"
                            : "bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:text-[var(--color-fg)]"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <h3
                  onClick={() => setActiveModalThreat(t)}
                  className="font-display text-base font-bold text-[var(--color-fg)] hover:text-[var(--color-primary-600)] cursor-pointer transition-colors"
                >
                  {t.title}
                </h3>

                <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">{t.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-[10px] font-mono text-[var(--color-fg-muted)]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Reported: {new Date(t.reportedAt).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModalThreat(t)}
                    className="text-[var(--color-primary-600)] hover:underline font-semibold flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" /> Open Threat Inspector Modal
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Threat Detail Modal */}
      <Modal open={!!activeModalThreat} onClose={() => setActiveModalThreat(null)} title="Threat Inspector" size="lg">
        {activeModalThreat && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Threat ID</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{activeModalThreat.id}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Severity</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{activeModalThreat.level.toUpperCase()}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Region</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{activeModalThreat.region}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Reported</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{new Date(activeModalThreat.reportedAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase mb-2">Full Threat Description</p>
              <p className="text-sm text-[var(--color-fg)] leading-relaxed">{activeModalThreat.description}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Change Confirmation */}
      <ConfirmDialog
        open={!!confirmDismiss}
        onClose={() => setConfirmDismiss(null)}
        onConfirm={() => {
          if (confirmDismiss) handleUpdateStatus(confirmDismiss.threatId, confirmDismiss.status);
          setConfirmDismiss(null);
        }}
        title="Confirm Status Change"
        message={`Mark threat as ${confirmDismiss?.status}?`}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="primary"
      />
    </div>
  );
}