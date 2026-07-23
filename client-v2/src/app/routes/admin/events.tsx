import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/lib/api";
import { useState, useMemo, lazy, Suspense } from "react";
import {
  Clock,
  Download,
  AlertTriangle,
  MapPin,
  GitCommit,
  ChevronRight,
  Search,
} from "lucide-react";

const LeafletMap = lazy(() =>
  import("@/components/maps/LeafletMap").then((m) => ({ default: m.LeafletMap }))
);

const MOCK_CORRELATIONS = [
  { id: "c1", title: "Tanker Intercept Chain", events: ["GPS Jamming Reported", "Naval Patrol Dispatched", "Diplomatic Note Issued"] },
  { id: "c2", title: "Airspace Anomaly Cluster", events: ["Unannounced ADS-B Transponder Dark", "Fighter Jet Scramble", "Air Defense Alert Level 2"] },
];

export default function AdminEvents() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => getEvents({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);

  const rawEvents = data?.data ?? [];

  const filteredEvents = useMemo(() => {
    return rawEvents.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        selectedType === "all" || e.type.toLowerCase() === selectedType.toLowerCase();

      const matchesSeverity =
        selectedSeverity === "all" || e.severity.toLowerCase() === selectedSeverity.toLowerCase();

      return matchesSearch && matchesType && matchesSeverity;
    });
  }, [rawEvents, searchQuery, selectedType, selectedSeverity]);

  const exportEvents = (format: "json" | "csv") => {
    if (filteredEvents.length === 0) return;
    const content =
      format === "json"
        ? JSON.stringify(filteredEvents, null, 2)
        : "ID,Type,Severity,Title,Country,OccurredAt\n" +
          filteredEvents
            .map(
              (e) =>
                `"${e.id}","${e.type}","${e.severity}","${e.title.replace(/"/g, '""')}","${e.country || ""}","${e.occurredAt}"`
            )
            .join("\n");

    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hormuz_events_export_${Date.now()}.${format}`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        <span className="text-xs font-mono text-[var(--color-fg-muted)]">Building events timeline feed...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-xl border border-red-500/30 bg-red-500/5 my-12">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500 font-semibold text-sm">Failed to Load Intelligence Events</p>
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
            <Clock className="h-6 w-6 text-[var(--color-primary-600)]" />
            <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Events Intelligence Timeline</h1>
          </div>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Chronological feed of correlated regional military, maritime, and geopolitical security events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCorrelation(!showCorrelation)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition-all inline-flex items-center gap-1.5 ${
              showCorrelation
                ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                : "bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elevated)]"
            }`}
          >
            <GitCommit className="h-3.5 w-3.5" />
            {showCorrelation ? "Hide Correlation View" : "Correlation View"}
          </button>

          <button
            type="button"
            onClick={() => exportEvents("json")}
            className="px-3 py-2 rounded-xl text-xs font-mono border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-fg)] inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Optional Mini-Map Preview Toggle */}
      {showMiniMap && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--color-fg)] uppercase">
              <MapPin className="h-4 w-4 text-[var(--color-primary-600)]" />
              Event Geospatial Mini-Map Overlay
            </div>
            <button
              type="button"
              onClick={() => setShowMiniMap(false)}
              className="text-[10px] font-mono text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              Hide Map
            </button>
          </div>
          <div className="h-48 rounded-lg overflow-hidden border border-[var(--color-border)] relative">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated)] text-xs text-[var(--color-fg-muted)]">
                  Loading Event Map...
                </div>
              }
            >
              <LeafletMap className="h-full w-full" />
            </Suspense>
          </div>
        </div>
      )}

      {/* Correlation Tree Panel */}
      {showCorrelation && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5 space-y-4 animate-in fade-in duration-200">
          <h3 className="font-display text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <GitCommit className="h-4 w-4" /> Multi-Event Threat Correlation Chains
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_CORRELATIONS.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-purple-500/20 bg-[var(--color-bg-card)] space-y-2">
                <h4 className="font-semibold text-xs text-[var(--color-fg)]">{c.title}</h4>
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                  {c.events.map((ev, idx) => (
                    <span key={ev} className="flex items-center gap-1 text-purple-400">
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">{ev}</span>
                      {idx < c.events.length - 1 && <ChevronRight className="h-3 w-3 text-[var(--color-fg-muted)]" />}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title or type..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-9 pr-4 py-2 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
        >
          <option value="all">All Event Types</option>
          <option value="military movement">Military Movement</option>
          <option value="diplomatic">Diplomatic Note</option>
          <option value="sanctions">Sanctions / Policy</option>
          <option value="ais anomaly">AIS / Navigation Anomaly</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none font-mono"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
        </select>
      </div>

      {/* Events Timeline Feed */}
      <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--color-border)]">
        {filteredEvents.map((e) => {
          const isCritical = e.severity?.toLowerCase() === "critical";
          const isHigh = e.severity?.toLowerCase() === "high";

          return (
            <div key={e.id} className="relative pl-12">
              <div
                className={`absolute left-4 top-4 h-4.5 w-4.5 -translate-x-1/2 rounded-full border-2 bg-[var(--color-bg-card)] flex items-center justify-center ${
                  isCritical
                    ? "border-[var(--color-danger)] text-[var(--color-danger)] shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                    : isHigh
                    ? "border-amber-500 text-amber-500"
                    : "border-[var(--color-primary-600)] text-[var(--color-primary-600)]"
                }`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-current" />
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-3 hover:border-[var(--color-primary-600)]/40 transition-colors shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/30">
                      {e.type}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isCritical
                          ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30"
                          : isHigh
                          ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                          : "bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border-[var(--color-primary-600)]/30"
                      }`}
                    >
                      SEVERITY: {e.severity}
                    </span>
                    {e.country && (
                      <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase">
                        [{e.country}]
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-[var(--color-fg-muted)]">
                    {new Date(e.occurredAt).toLocaleString()}
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-[var(--color-fg)]">{e.title}</h3>
                <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">{e.description}</p>

                {e.sources && e.sources.length > 0 && (
                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] font-mono text-[var(--color-fg-muted)]">
                    <span>{e.sources.length} Correlated Intelligence Sources</span>
                    <span className="text-[var(--color-primary-600)] font-semibold">VERIFIED TELEMETRY</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 text-[var(--color-fg-muted)] font-mono text-xs border border-dashed border-[var(--color-border)] rounded-xl ml-12">
            No intelligence events match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
