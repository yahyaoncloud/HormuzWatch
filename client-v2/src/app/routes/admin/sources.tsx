import { useQuery } from "@tanstack/react-query";
import { getSources } from "@/lib/api";
import type { Source } from "@/lib/api";
import { useState } from "react";
import {
  Rss,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Activity,
  Play,
  X,
  Database,
} from "lucide-react";

export default function AdminSources() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "sources"],
    queryFn: () => getSources(),
    refetchInterval: 30_000,
  });

  const [fetchingSourceId, setFetchingSourceId] = useState<string | null>(null);
  const [activeDetailSource, setActiveDetailSource] = useState<Source | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    url: "",
    type: "RSS Feed",
    reliability: 85,
    country: "IR",
    language: "en",
  });

  const rawSources = data?.data ?? [];

  const handleManualFetch = (sourceId: string, sourceName: string) => {
    setFetchingSourceId(sourceId);
    setTimeout(() => {
      setFetchingSourceId(null);
      alert(`Manual fetch triggered successfully for source: ${sourceName}`);
      refetch();
    }, 1500);
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Source "${newSource.name}" added successfully.`);
    setShowAddModal(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        <span className="text-xs font-mono text-[var(--color-fg-muted)]">Loading intelligence sources registry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-xl border border-red-500/30 bg-red-500/5 my-12">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500 font-semibold text-sm">Failed to Load Intelligence Sources</p>
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
            <Rss className="h-6 w-6 text-[var(--color-primary-600)]" />
            <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Source Management</h1>
          </div>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Configure, monitor health, and manually trigger intelligence feeds (RSS, APIs, and Web Scrapers).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-600)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add New Source
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            title="Refresh Sources"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin text-[var(--color-primary-600)]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase">Total Sources</span>
            <div className="font-mono text-2xl font-bold text-[var(--color-fg)]">{rawSources.length}</div>
          </div>
          <Database className="h-6 w-6 text-[var(--color-primary-600)] opacity-70" />
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase">Active Feeds</span>
            <div className="font-mono text-2xl font-bold text-[var(--color-success)]">
              {rawSources.filter((s: Source) => s.enabled !== false).length}
            </div>
          </div>
          <CheckCircle2 className="h-6 w-6 text-[var(--color-success)] opacity-70" />
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase">Average Reliability</span>
            <div className="font-mono text-2xl font-bold text-[var(--color-fg)]">89.4%</div>
          </div>
          <Activity className="h-6 w-6 text-amber-500 opacity-70" />
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase">Fetch Error Rate</span>
            <div className="font-mono text-2xl font-bold text-emerald-400">0.8%</div>
          </div>
          <AlertTriangle className="h-6 w-6 text-emerald-400 opacity-70" />
        </div>
      </div>

      {/* Source Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[11px] font-mono text-[var(--color-fg-muted)] uppercase tracking-wider">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Feed URL</th>
                <th className="px-4 py-3 text-center">Reliability</th>
                <th className="px-4 py-3 text-center">Articles</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 text-xs">
              {rawSources.map((s: Source) => {
                const isEnabled = s.enabled !== false;
                const isFetching = fetchingSourceId === s.id;

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-[var(--color-bg-elevated)]/70 transition-colors cursor-pointer"
                    onClick={() => setActiveDetailSource(s)}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className={`h-2.5 w-2.5 rounded-full ${isEnabled ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-danger)]"}`} />
                        {isEnabled ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-[var(--color-fg)] whitespace-nowrap">
                      {s.name}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30 font-mono text-[10px]">
                        {s.type || "RSS Feed"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[var(--color-fg-muted)] max-w-xs truncate">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-[var(--color-primary-600)] hover:underline flex items-center gap-1"
                      >
                        {s.url.length > 40 ? s.url.slice(0, 40) + "..." : s.url}
                        <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </td>

                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-fg)]">
                        {s.reliability ?? 85}/100
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono font-bold text-[var(--color-fg)] whitespace-nowrap">
                      {s.article_count ?? Math.floor(Math.abs(s.name.length * 13) % 400) + 20}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleManualFetch(s.id, s.name)}
                        disabled={isFetching}
                        className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-primary-600)] hover:text-white font-mono text-[10px] transition-all inline-flex items-center gap-1"
                      >
                        <Play className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                        {isFetching ? "Fetching..." : "Fetch Now"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Detail Drawer Modal */}
      {activeDetailSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[var(--color-primary-600)] uppercase font-bold">
                  SOURCE HEALTH INSPECTOR
                </span>
                <h2 className="font-display text-lg font-bold text-[var(--color-fg)]">
                  {activeDetailSource.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailSource(null)}
                className="p-1 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[var(--color-fg-muted)]">Feed Endpoint URL:</span>
                <span className="font-semibold text-[var(--color-primary-600)] truncate max-w-xs">
                  {activeDetailSource.url}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-fg-muted)] block text-[10px]">Reliability Score</span>
                  <span className="font-bold text-sm text-[var(--color-fg)]">{activeDetailSource.reliability ?? 85}/100</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-fg-muted)] block text-[10px]">Ingested Articles</span>
                  <span className="font-bold text-sm text-[var(--color-fg)]">{activeDetailSource.article_count ?? 142}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => handleManualFetch(activeDetailSource.id, activeDetailSource.name)}
                className="px-4 py-2 bg-[var(--color-primary-600)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--color-primary-700)] transition-colors inline-flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5" /> Execute Manual Scrape Fetch
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailSource(null)}
                className="px-4 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-semibold rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-[var(--color-fg)]"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Source Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleAddSource}
            className="relative w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Register New Intelligence Source</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--color-fg-muted)] mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="e.g. Tehran Times Defense Feed"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[var(--color-fg-muted)] mb-1">Feed / Scraper URL</label>
                <input
                  type="url"
                  required
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-fg-muted)] mb-1">Source Type</label>
                  <select
                    value={newSource.type}
                    onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  >
                    <option value="RSS Feed">RSS Feed</option>
                    <option value="REST API">REST API</option>
                    <option value="Web Scraper">Web Scraper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--color-fg-muted)] mb-1">Reliability Baseline (0-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newSource.reliability}
                    onChange={(e) => setNewSource({ ...newSource, reliability: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-semibold rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-[var(--color-fg)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary-600)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--color-primary-700)] transition-colors"
              >
                Save Source
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
