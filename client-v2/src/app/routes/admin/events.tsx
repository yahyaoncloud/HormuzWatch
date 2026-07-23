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
  Inbox,
} from "lucide-react";
import {
  PageHeader,
  PageHeaderAction,
  SearchFilter,
  LoadingState,
  ErrorState,
  EmptyState,
  Modal,
  KPICardGrid,
} from "@/components/ui";

const LeafletMap = lazy(() =>
  import("@/components/maps/LeafletMap").then((m) => ({ default: m.LeafletMap }))
);



const EVENT_TYPES = [
  { value: "all", label: "All Event Types" },
  { value: "military movement", label: "Military Movement" },
  { value: "diplomatic", label: "Diplomatic Note" },
  { value: "sanctions", label: "Sanctions / Policy" },
  { value: "ais anomaly", label: "AIS / Navigation Anomaly" },
] as const;

const SEVERITY_LEVELS = [
  { value: "all", label: "All Severities" },
  { value: "critical", label: "Critical Only" },
  { value: "high", label: "High Only" },
  { value: "medium", label: "Medium Only" },
] as const;

export default function AdminEvents() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => getEvents({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const rawEvents = data?.data ?? [];

  const correlations = useMemo(() => {
    const highSev = rawEvents.filter((e) => e.severity === 'critical' || e.severity === 'high');
    if (highSev.length < 2) return [];
    return [
      {
        id: "c1",
        title: "Live High-Severity Event Cluster",
        events: highSev.slice(0, 4).map((e) => e.title),
      },
    ];
  }, [rawEvents]);

  const filteredEvents = useMemo(() => {
    return rawEvents.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === "all" || e.type.toLowerCase() === selectedType.toLowerCase();
      const matchesSeverity = selectedSeverity === "all" || e.severity.toLowerCase() === selectedSeverity.toLowerCase();

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

  // KPI cards data
  const kpiCards = useMemo(() => [
    { icon: Clock, value: rawEvents.length, label: "Total Events", iconColor: "var(--color-primary-600)" },
    { icon: AlertTriangle, value: rawEvents.filter(e => e.severity?.toLowerCase() === "critical").length, label: "Critical", iconColor: "var(--color-danger)" },
    { icon: AlertTriangle, value: rawEvents.filter(e => e.severity?.toLowerCase() === "high").length, label: "High Severity", iconColor: "var(--color-warning)" },
    { icon: MapPin, value: new Set(rawEvents.map(e => e.country).filter(Boolean)).size, label: "Countries", iconColor: "var(--color-info)" },
  ], [rawEvents]);

  if (isLoading) {
    return <LoadingState message="Building events timeline feed..." size="md" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Intelligence Events"
        message={error instanceof Error ? error.message : "Unknown error"}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-ui pb-12">
      {/* Header */}
      <PageHeader
        icon={<Clock className="h-6 w-6" />}
        title="Events Intelligence Timeline"
        subtitle="Chronological feed of correlated regional military, maritime, and geopolitical security events."
        actions={
          <>
            <PageHeaderAction
              variant={showCorrelation ? "primary" : "secondary"}
              onClick={() => setShowCorrelation(!showCorrelation)}
              aria-label={showCorrelation ? "Hide correlation view" : "Show correlation view"}
            >
              <GitCommit className="h-3.5 w-3.5" />
              {showCorrelation ? "Hide Correlation View" : "Correlation View"}
            </PageHeaderAction>
            <PageHeaderAction
              onClick={() => exportEvents("json")}
              aria-label="Export events as JSON"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </PageHeaderAction>
            <PageHeaderAction
              onClick={() => exportEvents("csv")}
              aria-label="Export events as CSV"
              variant="ghost"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </PageHeaderAction>
          </>
        }
      />

      {/* KPI Cards */}
      <KPICardGrid cards={kpiCards} columns={4} className="mb-4" />

      {/* Optional Mini-Map Preview Toggle */}
      {showMiniMap && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-3 ">
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
          {correlations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {correlations.map((c) => (
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
          ) : (
            <p className="text-xs text-[var(--color-fg-muted)] font-mono">No active event correlation clusters detected in current dataset.</p>
          )}
        </div>
      )}

      {/* Search & Filter Controls */}
      <SearchFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search events by title or type..."
        filters={[
          { key: "type", label: "Event Type", value: selectedType, onChange: setSelectedType, options: EVENT_TYPES },
          { key: "severity", label: "Severity", value: selectedSeverity, onChange: setSelectedSeverity, options: SEVERITY_LEVELS },
        ]}
      />

      {/* Events Timeline Feed */}
      <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--color-border)]">
        {filteredEvents.length === 0 ? (
          <EmptyState
            title="No Intelligence Events Found"
            message="No events match your current filter criteria."
            icon={<Inbox className="h-8 w-8" />}
          />
        ) : (
          filteredEvents.map((e) => {
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

                <div
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-3 hover:border-[var(--color-primary-600)]/40 transition-colors  cursor-pointer"
                  onClick={() => setSelectedEvent(e)}
                >
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
          })
        )}
      </div>

      {/* Event Detail Modal */}
      <Modal
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Event Details"
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Event ID</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{selectedEvent.id}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Type</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{selectedEvent.type}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Severity</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{selectedEvent.severity}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Country</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{selectedEvent.country || "Unknown"}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Occurred</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{new Date(selectedEvent.occurredAt).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase">Sources</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">{selectedEvent.sources?.length || 0} sources</p>
              </div>
            </div>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase mb-2">Description</p>
              <p className="text-sm text-[var(--color-fg)] leading-relaxed">{selectedEvent.description}</p>
            </div>
            {selectedEvent.coordinates && (
              <div className="pt-2 border-t border-[var(--color-border)]">
                <p className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase mb-2">Coordinates</p>
                <p className="font-mono text-xs text-[var(--color-fg)]">
                  {selectedEvent.coordinates.lat?.toFixed(4)}, {selectedEvent.coordinates.lon?.toFixed(4)}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}