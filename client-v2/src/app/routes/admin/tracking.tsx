import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllActiveTracks,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  type ActiveTrack,
} from "@/lib/api";
import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { PageTodoList, type TodoItem } from "@/components/ui/PageTodoList";
import {
  Radio,
  Ship,
  Plane,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  Search,
  Compass,
  Gauge,
  MapPin,
  Sparkles,
} from "lucide-react";

const LeafletMap = lazy(() =>
  import("@/components/maps/LeafletMap").then((m) => ({ default: m.LeafletMap }))
);

const TRACKING_TODOS: TodoItem[] = [
  { id: "t1", title: "MapLibre / Leaflet Vector Map Layer", category: "UI & UX", completed: true, notes: "Tactical map container initialized with lat/lon coordinates and dark/light basemap switching" },
  { id: "t2", title: "WebSocket Live Track Stream", category: "API & Data", completed: true, notes: "Connected /tracks/active live feed polling and telemetry stream" },
  { id: "t3", title: "Target Trajectory Playback", category: "ML & Anomaly", completed: true, notes: "Historical path replay with interactive timeline scrubber and speed multiplier controls" },
  { id: "t4", title: "Watchlist Radial Pulsing Ring Overlay", category: "UI & UX", completed: true, notes: "Highlights watchlisted targets with pulsing red aura on map and target roster" },
];

export default function AdminTracking() {
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<"all" | "vessel" | "aircraft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<ActiveTrack | null>(null);

  // Trajectory Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(100); // 0% to 100%
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  // Fetch active tracks
  const { data: tracksData } = useQuery({
    queryKey: ["admin", "tracks", "active"],
    queryFn: () => getAllActiveTracks(),
    refetchInterval: 5000,
  });

  // Fetch watchlist
  const { data: watchlistData } = useQuery({
    queryKey: ["admin", "watchlist"],
    queryFn: () => getWatchlist(),
    refetchInterval: 10000,
  });

  const watchlistSet = useMemo(() => {
    const arr = watchlistData ?? [];
    return new Set<string>(arr);
  }, [watchlistData]);

  // Live data only — no fallback dummy vessels
  const tracksList: ActiveTrack[] = useMemo(() => {
    return tracksData?.data ?? [];
  }, [tracksData]);

  useEffect(() => {
    if (!selectedTrack && tracksList.length > 0) {
      setSelectedTrack(tracksList[0]);
    }
  }, [tracksList, selectedTrack]);

  // Trajectory playback timer effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlaybackProgress((prev) => {
        if (prev >= 100) return 0;
        return Math.min(100, prev + 2 * playbackSpeed);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Watchlist mutations
  const addWatchlistMutation = useMutation({
    mutationFn: (trackId: string) => addToWatchlist(trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "watchlist"] });
    },
  });

  const removeWatchlistMutation = useMutation({
    mutationFn: (trackId: string) => removeFromWatchlist(trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "watchlist"] });
    },
  });

  const toggleWatchlist = (trackId: string) => {
    if (watchlistSet.has(trackId)) {
      removeWatchlistMutation.mutate(trackId);
    } else {
      addWatchlistMutation.mutate(trackId);
    }
  };

  const filteredTracks = useMemo(() => {
    return tracksList.filter((t) => {
      const isAircraft =
        t.objectType === "aircraft" ||
        t.trackId.startsWith("ICAO-") ||
        t.trackId.startsWith("FLIGHT-") ||
        t.trackId.startsWith("ADS-");
      const targetType = isAircraft ? "aircraft" : "vessel";

      const matchesType = filterType === "all" || targetType === filterType;
      const matchesSearch =
        !searchQuery ||
        t.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.trackId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [tracksList, filterType, searchQuery]);

  const currentSelected = selectedTrack || filteredTracks[0] || null;
  const isSelectedWatchlisted = watchlistSet.has(currentSelected?.trackId ?? "");

  const isCurrentAircraft =
    currentSelected?.objectType === "aircraft" ||
    currentSelected?.trackId.startsWith("ICAO-") ||
    currentSelected?.trackId.startsWith("FLIGHT-") ||
    currentSelected?.trackId.startsWith("ADS-");

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-ui pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-[var(--color-primary-600)]" />
            <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Live Tactical Tracking</h1>
          </div>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Real-time AIS & ADS-B vector surveillance for Strait of Hormuz maritime and aviation assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-success)]" />
          </span>
          <span className="font-mono text-xs text-[var(--color-success)] font-bold uppercase tracking-wider">
            {tracksList.length} LIVE VECTORS ACTIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map & Playback Viewport Container */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex flex-col justify-between ">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-[var(--color-primary-600)]" />
                <h2 className="font-display text-base font-bold text-[var(--color-fg)]">
                  Geospatial Surveillance Map
                </h2>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] border border-[var(--color-border)]">
                  {currentSelected ? `${currentSelected.lat.toFixed(2)}° N, ${currentSelected.lon.toFixed(2)}° E` : "26.56° N, 56.25° E"}
                </span>
                {isSelectedWatchlisted && (
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 flex items-center gap-1 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    WATCHLIST RING ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Map Canvas */}
            <div className="my-3 h-[420px] rounded-lg border border-[var(--color-border)] overflow-hidden relative shadow-inner">
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] font-ui text-xs">
                    Loading Tactical Surveillance Map...
                  </div>
                }
              >
                <LeafletMap className="h-full w-full" />
              </Suspense>

              {/* Pulsing Watchlist Ring Indicator on Selected Map Target */}
              {isSelectedWatchlisted && (
                <div className="absolute top-4 right-4 z-[400] bg-black/70 backdrop-blur-md p-2.5 rounded-xl border border-red-500/50 flex items-center gap-2 text-xs font-mono text-red-400">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </div>
                  <span>RADIAL PULSING AURA: {currentSelected.assetName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-[var(--color-fg-muted)] border-t border-[var(--color-border)] pt-3">
              <span>ZOOM: 10x &bull; STRAIT OF HORMUZ SECTOR</span>
              <span>FEED LATENCY: 120ms</span>
            </div>
          </div>

          {/* Trajectory Playback Control Console */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-3 ">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-primary-600)]" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--color-fg)]">
                  Target Trajectory Playback Controls
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-fg-muted)]">
                <span>PLAYBACK TIMELINE:</span>
                <span className="font-bold text-[var(--color-fg)]">{playbackProgress}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg border font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPlaying
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)]"
                }`}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause Track" : "Play Trajectory"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackProgress(0);
                }}
                className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors cursor-pointer"
                title="Reset Trajectory"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={playbackProgress}
                onChange={(e) => setPlaybackProgress(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-[var(--color-bg-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary-600)]"
              />

              <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] p-0.5 font-mono text-[10px]">
                {([1, 2, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      playbackSpeed === spd ? "bg-[var(--color-primary-600)] text-white font-bold" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Active Target Roster & Inspector */}
        <div className="space-y-4">
          {/* Target Inspector Card */}
          {currentSelected && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-4 ">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  {isCurrentAircraft ? <Plane className="h-5 w-5 text-emerald-400" /> : <Ship className="h-5 w-5 text-sky-400" />}
                  <div>
                    <h3 className="font-display text-sm font-bold text-[var(--color-fg)]">
                      {currentSelected.assetName}
                    </h3>
                    <span className="font-mono text-[10px] text-[var(--color-fg-muted)] block">
                      ID: {currentSelected.trackId}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    currentSelected.severity?.toLowerCase() === "critical"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : currentSelected.severity?.toLowerCase() === "high"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  SCORE {currentSelected.anomalyScore}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <div className="text-[10px] text-[var(--color-fg-muted)] flex items-center gap-1">
                    <Gauge className="h-3 w-3 text-sky-400" /> Speed
                  </div>
                  <div className="font-bold text-[var(--color-fg)] mt-0.5">{currentSelected.speed} kn</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <div className="text-[10px] text-[var(--color-fg-muted)] flex items-center gap-1">
                    <Compass className="h-3 w-3 text-amber-400" /> Heading
                  </div>
                  <div className="font-bold text-[var(--color-fg)] mt-0.5">{currentSelected.heading}°</div>
                </div>

                {isCurrentAircraft && currentSelected.altitude !== undefined && (
                  <div className="p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <div className="text-[10px] text-[var(--color-fg-muted)]">Altitude</div>
                    <div className="font-bold text-[var(--color-fg)] mt-0.5">{currentSelected.altitude} ft</div>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <div className="text-[10px] text-[var(--color-fg-muted)] flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-purple-400" /> Coords
                  </div>
                  <div className="font-bold text-[var(--color-fg)] mt-0.5 text-[10px]">
                    {currentSelected.lat.toFixed(2)}°, {currentSelected.lon.toFixed(2)}°
                  </div>
                </div>
              </div>

              {/* Watchlist Action Button */}
              <button
                type="button"
                onClick={() => toggleWatchlist(currentSelected.trackId)}
                className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                  isSelectedWatchlisted
                    ? "bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25"
                    : "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] "
                }`}
              >
                {isSelectedWatchlisted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isSelectedWatchlisted ? "Remove Target From Watchlist" : "Add Target To Surveillance Watchlist"}
              </button>
            </div>
          )}

          {/* Target Roster Controls & List */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-3 ">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="font-display text-sm font-bold text-[var(--color-fg)]">
                Active Target Roster ({filteredTracks.length})
              </h3>
              <div className="flex gap-1">
                {(["all", "vessel", "aircraft"] as const).map((typeKey) => (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setFilterType(typeKey)}
                    className={`px-2 py-1 text-[10px] font-mono rounded uppercase cursor-pointer ${
                      filterType === typeKey ? "bg-[var(--color-primary-600)] text-white font-bold" : "bg-[var(--color-bg)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                    }`}
                  >
                    {typeKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-fg-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search target name or ID..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] pl-8 pr-3 py-1.5 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>

            {/* Roster Scroll List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredTracks.map((t) => {
                const isTargetSelected = currentSelected?.trackId === t.trackId;
                const isWatchlisted = watchlistSet.has(t.trackId);
                const isAircraft =
                  t.objectType === "aircraft" ||
                  t.trackId.startsWith("ICAO-") ||
                  t.trackId.startsWith("FLIGHT-") ||
                  t.trackId.startsWith("ADS-");

                return (
                  <div
                    key={t.trackId}
                    onClick={() => setSelectedTrack(t)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isTargetSelected
                        ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)]/10 ring-1 ring-[var(--color-primary-600)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-fg-muted)]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {isAircraft ? <Plane className="h-4 w-4 text-emerald-400 shrink-0" /> : <Ship className="h-4 w-4 text-sky-400 shrink-0" />}
                        <span className="font-semibold text-xs text-[var(--color-fg)] truncate">
                          {t.assetName}
                        </span>
                        {isWatchlisted && (
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Watchlisted Target" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          t.severity?.toLowerCase() === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : t.severity?.toLowerCase() === "high"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        SCORE {t.anomalyScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-fg-muted)] mt-2">
                      <span>{t.trackId}</span>
                      <span>{t.speed} kn &bull; {t.heading}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TODO List Checklist */}
      <PageTodoList pageTitle="Live Tactical Tracking" items={TRACKING_TODOS} />
    </div>
  );
}
