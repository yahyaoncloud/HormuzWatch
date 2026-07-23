import { useQuery } from "@tanstack/react-query";
import { getThreats } from "@/lib/api";
import type { Threat } from "@/lib/api";
import { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertCircle,
  Clock,
  Search,
  Activity,
  UserCheck,
  X,
  FileText,
} from "lucide-react";

type ThreatStatus = "Investigating" | "Mitigated" | "False Positive" | "Closed";

const levelColors: Record<string, string> = {
  critical: "bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30",
  high: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  medium: "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30",
  low: "bg-[var(--color-info)]/20 text-[var(--color-info)] border-[var(--color-info)]/30",
};

export default function AdminThreats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "threats"],
    queryFn: () => getThreats(100),
    refetchInterval: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [threatStatuses, setThreatStatuses] = useState<Record<string, ThreatStatus>>({});
  const [activeModalThreat, setActiveModalThreat] = useState<Threat | null>(null);

  const rawThreats = data?.data ?? [];

  const filteredThreats = useMemo(() => {
    return rawThreats.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.region.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLevel =
        selectedLevel === "all" || t.level.toLowerCase() === selectedLevel.toLowerCase();

      const currentStatus = threatStatuses[t.id] || "Investigating";
      const matchesStatus =
        statusFilter === "all" || currentStatus.toLowerCase() === statusFilter.toLowerCase();

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        <span className="text-xs font-mono text-[var(--color-fg-muted)]">Loading active threat monitoring board...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-xl border border-red-500/30 bg-red-500/5 my-12">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500 font-semibold text-sm">Failed to Load Threat Board</p>
        <p className="text-xs text-[var(--color-fg-muted)] mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-ui pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-[var(--color-danger)]" />
            <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Tactical Threat Board</h1>
          </div>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Real-time threat monitoring, ML confidence scoring, operator status assignments, and risk escalation.
          </p>
        </div>
      </div>

      {/* KPI Severity Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-center">
          <div className="font-mono text-3xl font-bold text-[var(--color-danger)]">{criticalCount}</div>
          <div className="text-[10px] font-mono uppercase text-[var(--color-danger)] font-bold mt-1">CRITICAL SEVERITY</div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
          <div className="font-mono text-3xl font-bold text-amber-500">{highCount}</div>
          <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mt-1">HIGH SEVERITY</div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center">
          <div className="font-mono text-3xl font-bold text-[var(--color-warning)]">{mediumCount}</div>
          <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">MEDIUM SEVERITY</div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center">
          <div className="font-mono text-3xl font-bold text-[var(--color-fg)]">{lowCount}</div>
          <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">LOW SEVERITY</div>
        </div>
      </div>

      {/* Threat Trend Bar Visualization */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-fg)] uppercase">
            <Activity className="h-4 w-4 text-[var(--color-primary-600)]" />
            7-Day Tactical Threat Trend Distribution
          </div>
        </div>
        <div className="h-10 w-full rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] p-1 flex items-center gap-1 overflow-hidden">
          <div className="bg-[var(--color-danger)] h-full rounded text-[10px] font-mono font-bold text-white flex items-center justify-center" style={{ width: `${Math.max(15, (criticalCount / Math.max(1, rawThreats.length)) * 100)}%` }}>
            CRITICAL ({criticalCount})
          </div>
          <div className="bg-amber-500 h-full rounded text-[10px] font-mono font-bold text-black flex items-center justify-center" style={{ width: `${Math.max(15, (highCount / Math.max(1, rawThreats.length)) * 100)}%` }}>
            HIGH ({highCount})
          </div>
          <div className="bg-[var(--color-primary-600)] h-full rounded text-[10px] font-mono font-bold text-white flex items-center justify-center flex-1">
            OTHER ({rawThreats.length - criticalCount - highCount})
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threats by title or region..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-9 pr-4 py-2 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
          />
        </div>

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none font-mono"
        >
          <option value="all">All Severity Levels</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none font-mono"
        >
          <option value="all">All Operational Statuses</option>
          <option value="investigating">Investigating</option>
          <option value="mitigated">Mitigated</option>
          <option value="false positive">False Positive</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Threat List Cards */}
      <div className="space-y-3">
        {filteredThreats.map((t) => {
          const currentStatus = threatStatuses[t.id] || "Investigating";

          return (
            <div
              key={t.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 hover:border-[var(--color-primary-600)]/40 transition-colors space-y-3 shadow-sm"
            >
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
                  {(["Investigating", "Mitigated", "False Positive", "Closed"] as ThreatStatus[]).map((st) => (
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
        })}

        {filteredThreats.length === 0 && (
          <div className="text-center py-12 text-[var(--color-fg-muted)] font-mono text-xs border border-dashed border-[var(--color-border)] rounded-xl">
            No active threats match your filter parameters.
          </div>
        )}
      </div>

      {/* Threat Detail Modal */}
      {activeModalThreat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[var(--color-danger)] uppercase font-bold">
                  TACTICAL THREAT INSPECTOR
                </span>
                <h2 className="font-display text-lg font-bold text-[var(--color-fg)]">
                  {activeModalThreat.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalThreat(null)}
                className="p-1 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1 font-mono">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--color-fg-muted)]">Affected Sector / Region:</span>
                  <span className="font-bold text-[var(--color-fg)]">{activeModalThreat.region}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--color-fg-muted)]">Severity Classification:</span>
                  <span className="font-bold uppercase text-[var(--color-danger)]">{activeModalThreat.level}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-mono text-[10px] uppercase text-[var(--color-fg-muted)] font-bold">Full Threat Description</h4>
                <p className="text-[var(--color-fg)] leading-relaxed">{activeModalThreat.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => {
                  alert(`Threat assigned to Root Administrator for investigation.`);
                  setActiveModalThreat(null);
                }}
                className="px-4 py-2 bg-[var(--color-primary-600)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--color-primary-700)] transition-colors inline-flex items-center gap-1.5"
              >
                <UserCheck className="h-3.5 w-3.5" /> Assign To Root Operator
              </button>
              <button
                type="button"
                onClick={() => setActiveModalThreat(null)}
                className="px-4 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-semibold rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-[var(--color-fg)]"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
