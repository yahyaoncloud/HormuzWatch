import { useQuery } from "@tanstack/react-query";
import { getDatasets, getDatasetStatus } from "@/lib/api";
import type { DatasetFile } from "@/lib/api";

export default function AdminDatasets() {
  const { data: datasetsData, isLoading: dsLoading, error: dsError } = useQuery({
    queryKey: ["admin", "datasets"],
    queryFn: () => getDatasets(),
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["admin", "dataset-status"],
    queryFn: () => getDatasetStatus(),
  });

  const isLoading = dsLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-[var(--color-fg-muted)]">Loading datasets...</span>
      </div>
    );
  }

  if (dsError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold">Failed to load datasets</p>
        <p className="text-xs text-[var(--color-fg-muted)] mt-1">{dsError instanceof Error ? dsError.message : "Unknown error"}</p>
      </div>
    );
  }

  const files: DatasetFile[] = datasetsData?.datasets ?? [];
  const status = statusData;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Dataset Pipeline</h1>
        <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
          GDrive backup management and snapshot controls
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center">
          <div className="font-mono text-2xl font-bold text-[var(--color-fg)]">{status?.queueDepth ?? '—'}</div>
          <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">Queue Depth</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center">
          <div className="font-mono text-2xl font-bold text-[var(--color-fg)]">{status?.retention ?? '—'}d</div>
          <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">Retention</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center">
          <div className={`font-mono text-sm font-bold ${status?.driveConfigured ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
            {status?.driveConfigured ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="text-[10px] font-mono uppercase text-[var(--color-fg-muted)] mt-1">Drive Status</div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Size</th>
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f: DatasetFile) => (
              <tr key={f.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-bg-elevated)] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-fg)]">{f.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-fg-muted)]">
                  {typeof f.size === 'number' ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : f.size}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
                  {new Date(f.createdTime).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files.length === 0 && (
          <div className="text-center py-12 text-[var(--color-fg-muted)]">No dataset files found in Drive.</div>
        )}
      </div>
    </div>
  );
}
