import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  exportDataset,
  listExports,
  deleteExport,
  getExportDownloadUrl,
  type ExportRequest,
  type ExportResult,
  type ExportFileInfo,
} from "@/lib/api";
import { useState } from "react";
import {
  Download,
  Trash2,
  FileArchive,
  FileJson,
  Database,
  Clock,
  RefreshCw,
  HardDrive,
} from "lucide-react";

const PERIOD_OPTIONS = [
  { label: "Last Hour", hours: 1 },
  { label: "Last 6 Hours", hours: 6 },
  { label: "Last 24 Hours", hours: 24 },
  { label: "Last 7 Days", hours: 168 },
  { label: "Last 30 Days", hours: 720 },
  { label: "All Data", hours: 0 },
];

const TABLE_LABELS: Record<string, string> = {
  telemetry_observations: "Telemetry Observations",
  tracks: "Active Tracks",
  anomalies: "Anomalies",
  transit_events: "Transit Events",
  events: "Intelligence Events",
  articles: "News Articles",
};

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`;
}

function formatAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminDatasets() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(24);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [selectedTables, setSelectedTables] = useState<string[]>([
    "telemetry_observations",
    "tracks",
    "anomalies",
    "transit_events",
  ]);

  // Last export result for feedback
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  // Fetch export history
  const {
    data: exportsData,
    isLoading: exportsLoading,
    error: exportsError,
  } = useQuery({
    queryKey: ["admin", "dataset-exports"],
    queryFn: () => listExports(),
    refetchInterval: 15000,
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (req: ExportRequest) => exportDataset(req),
    onSuccess: (result) => {
      setLastExport(result);
      queryClient.invalidateQueries({ queryKey: ["admin", "dataset-exports"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (filename: string) => deleteExport(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dataset-exports"] });
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      period_hours: period,
      format,
      tables: selectedTables.join(","),
    });
  };

  const toggleTable = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  const handleDownload = async (file: ExportFileInfo) => {
    const url = getExportDownloadUrl(file.name);
    // Trigger browser download
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exports = exportsData?.exports ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-ui pb-12">
      <div className="border-b border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-[var(--color-primary-600)]" />
          <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Dataset Export Manager</h1>
        </div>
        <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
          Export curated datasets from PostgreSQL tables to CSV or JSON for offline analysis.
          Files are saved to local server storage and available for download.
        </p>
      </div>

      {/* Export Configuration Card */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <HardDrive className="h-4 w-4 text-[var(--color-primary-600)]" />
          <h2 className="font-display text-sm font-bold text-[var(--color-fg)]">Export Configuration</h2>
        </div>

        {/* Period Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase text-[var(--color-fg-muted)] tracking-wider">
            Time Period
          </label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                type="button"
                onClick={() => setPeriod(opt.hours)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${
                  period === opt.hours
                    ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                    : "bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-fg-muted)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase text-[var(--color-fg-muted)] tracking-wider">
            Export Format
          </label>
          <div className="flex gap-2">
            {(["csv", "json"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all flex items-center gap-1.5 ${
                  format === fmt
                    ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                    : "bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-fg-muted)]"
                }`}
              >
                {fmt === "csv" ? <FileArchive className="h-3.5 w-3.5" /> : <FileJson className="h-3.5 w-3.5" />}
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase text-[var(--color-fg-muted)] tracking-wider">
            Tables to Export
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TABLE_LABELS).map(([table, label]) => (
              <button
                key={table}
                type="button"
                onClick={() => toggleTable(table)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                  selectedTables.includes(table)
                    ? "bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border-[var(--color-primary-600)]/30 font-semibold"
                    : "bg-[var(--color-bg)] text-[var(--color-fg-muted)] border-[var(--color-border)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-fg-muted)] font-mono">
            {selectedTables.length} table{selectedTables.length !== 1 ? "s" : ""} selected
            {period > 0 && ` • ${period}h window`}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportMutation.isPending || selectedTables.length === 0}
            className="px-4 py-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center gap-2 transition-colors"
          >
            {exportMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Dataset
              </>
            )}
          </button>
        </div>

        {/* Error / Success Feedback */}
        {exportMutation.isError && (
          <div className="p-3 rounded-md bg-red-500/15 border border-red-500/30 text-xs text-red-400 font-mono">
            Export failed: {exportMutation.error instanceof Error ? exportMutation.error.message : "Unknown error"}
          </div>
        )}
        {lastExport && exportMutation.isSuccess && (
          <div className="p-3 rounded-md bg-[var(--color-success)]/15 border border-[var(--color-success)]/30 text-xs text-[var(--color-success)] font-mono">
            Export complete: {lastExport.label} ({lastExport.files.length} file
            {lastExport.files.length !== 1 ? "s" : ""})
          </div>
        )}
      </div>

      {/* Export History */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <Clock className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <h2 className="font-display text-sm font-bold text-[var(--color-fg)]">
            Export History ({exports.length})
          </h2>
        </div>

        {exportsLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-fg-muted)]" />
            <span className="ml-3 text-sm text-[var(--color-fg-muted)]">Loading exports...</span>
          </div>
        ) : exportsError ? (
          <div className="p-8 text-center">
            <p className="text-red-500 text-sm font-semibold">Failed to load exports</p>
            <p className="text-xs text-[var(--color-fg-muted)] mt-1">
              {exportsError instanceof Error ? exportsError.message : "Unknown error"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                <th className="px-4 py-2.5 text-left font-ui text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider">
                  File
                </th>
                <th className="px-4 py-2.5 text-left font-ui text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Format
                </th>
                <th className="px-4 py-2.5 text-left font-ui text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-2.5 text-left font-ui text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-2.5 text-right font-ui text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {exports.map((file) => (
                <tr
                  key={file.name}
                  className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-bg-elevated)] transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {file.format === "csv" ? (
                        <FileArchive className="h-4 w-4 text-[var(--color-primary-600)]" />
                      ) : (
                        <FileJson className="h-4 w-4 text-amber-400" />
                      )}
                      <span className="font-mono text-xs text-[var(--color-fg)]">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] uppercase">
                      {file.format}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-fg-muted)]">
                    {formatSize(file.size)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-fg-muted)]">
                    {formatAge(file.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        className="p-1.5 rounded-md hover:bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete ${file.name}?`)) {
                            deleteMutation.mutate(file.name);
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-red-500/15 text-[var(--color-fg-muted)] hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!exportsLoading && exports.length === 0 && (
          <div className="text-center py-12 text-[var(--color-fg-muted)]">
            <HardDrive className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No exported datasets yet</p>
            <p className="text-xs mt-1">Configure and trigger an export above to generate your first dataset.</p>
          </div>
        )}
      </div>
    </div>
  );
}
