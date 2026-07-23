import { useState } from "react";
import { Filter, Download } from "lucide-react";
import { PageTodoList, type TodoItem } from "@/components/ui/PageTodoList";

const AUDIT_TODOS: TodoItem[] = [
  { id: "a1", title: "Forensic Audit Log Table & Severity Filter", category: "UI & UX", completed: true, notes: "Search, filter by severity, and render timestamped log entries" },
  { id: "a2", title: "Backend GET /audit Integration", category: "API & Data", completed: false, notes: "Connect Go backend API endpoint for streaming real database logs" },
  { id: "a3", title: "JSON Payload Diff Inspection Drawer", category: "UI & UX", completed: false, notes: "Side-by-side JSON diff viewer for before/after setting state" },
  { id: "a4", title: "Cryptographic Log Signing & CSV Export", category: "Security & Auth", completed: false, notes: "Export signed audit logs for compliance requirements" },
];

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  severity: "info" | "warning" | "danger";
  details: string;
  ip: string;
}

export default function AdminAudit() {
  const [logs] = useState<AuditLogEntry[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    const matchesQuery =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesQuery;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Audit Trail & Forensic Log</h1>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Immutable log of system modifications, security authentication events, and administrative actions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {}}
          className="px-3 py-1.5 border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] text-xs font-ui font-semibold text-[var(--color-fg)] rounded-lg flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV Log
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit actions, actors, targets, or details..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="danger">Security Critical</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-left">
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Timestamp (UTC)</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Actor</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Target</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Details</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-bg-elevated)] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-fg-muted)] whitespace-nowrap">{log.timestamp}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--color-fg)]">{log.actor}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      log.severity === "danger"
                        ? "bg-red-500/20 text-red-500 border-red-500/30"
                        : log.severity === "warning"
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border-[var(--color-primary-600)]/30"
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-fg)]">{log.target}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)] max-w-xs truncate" title={log.details}>
                  {log.details}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-fg-muted)]">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TODO List Component */}
      <PageTodoList pageTitle="Audit Trail & Forensic Log" items={AUDIT_TODOS} />
    </div>
  );
}
