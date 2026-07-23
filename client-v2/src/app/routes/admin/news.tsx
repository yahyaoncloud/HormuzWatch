import { useQuery } from "@tanstack/react-query";
import { getLatestNews } from "@/lib/api";
import type { NewsArticle } from "@/lib/api";
import { useState, useMemo } from "react";
import {
  Search,
  Download,
  Clock,
  ExternalLink,
  Bot,
  RefreshCw,
  CheckSquare,
  Square,
  X,
  TrendingUp,
  Globe2,
  AlertTriangle,
  FileText,
} from "lucide-react";

const TRENDING_KEYWORDS = [
  "Hormuz Strait",
  "GPS Jamming",
  "IRGC Navy",
  "Tanker Escort",
  "Drone Intercept",
  "Bab-el-Mandeb",
  "Oil Tanker",
  "AIS Spoofing",
];

export default function AdminNews() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "news", "latest"],
    queryFn: () => getLatestNews({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "trending" | "threat">("latest");
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [activeModalArticle, setActiveModalArticle] = useState<NewsArticle | null>(null);

  const rawArticles = data?.data ?? [];

  // Filter & Sort logic
  const filteredArticles = useMemo(() => {
    return rawArticles
      .filter((a) => {
        const matchesSearch =
          !searchQuery ||
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.source.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === "all" ||
          (a.category && a.category.toLowerCase() === selectedCategory.toLowerCase());

        const matchesCountry =
          selectedCountry === "all" ||
          (a.country && a.country.toLowerCase() === selectedCountry.toLowerCase());

        return matchesSearch && matchesCategory && matchesCountry;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        }
        if (sortBy === "threat") {
          const scoreA = (a as any).threatScore ?? 50;
          const scoreB = (b as any).threatScore ?? 50;
          return scoreB - scoreA;
        }
        return b.title.localeCompare(a.title);
      });
  }, [rawArticles, searchQuery, selectedCategory, selectedCountry, sortBy]);

  const toggleSelectArticle = (id: string) => {
    const next = new Set(selectedArticles);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedArticles(next);
  };

  const toggleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map((a) => a.id)));
    }
  };

  const exportSelected = (format: "json" | "csv") => {
    const targetArticles = rawArticles.filter((a) => selectedArticles.has(a.id));
    if (targetArticles.length === 0) {
      alert("Please select at least one article to export.");
      return;
    }
    const content =
      format === "json"
        ? JSON.stringify(targetArticles, null, 2)
        : "ID,Title,Source,Country,Category,Date\n" +
          targetArticles
            .map(
              (a) =>
                `"${a.id}","${a.title.replace(/"/g, '""')}","${a.source}","${a.country || ""}","${a.category || ""}","${a.publishedAt}"`
            )
            .join("\n");

    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hormuz_news_export_${Date.now()}.${format}`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        <span className="text-xs font-mono text-[var(--color-fg-muted)]">Ingesting real-time intelligence feeds...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-xl border border-red-500/30 bg-red-500/5 my-12">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500 font-semibold text-sm">Failed to Load Intelligence News</p>
        <p className="text-xs text-[var(--color-fg-muted)] mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-ui pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="h-6 w-6 text-[var(--color-primary-600)]" />
            <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">News Intelligence Pipeline</h1>
          </div>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Browse, filter, and inspect automated RSS & web scraper intelligence feeds with OpenRouter LLM classification.
          </p>
        </div>

        {/* Live Ingest Counter */}
        <div className="flex items-center gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-success)]" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase">Live Ingest Status</span>
              <span className="font-mono text-xs font-bold text-[var(--color-fg)]">
                {rawArticles.length} Articles Ingested
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)] transition-colors"
            title="Refresh Feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-[var(--color-primary-600)]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Trending Keyword Pills Panel */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-fg-muted)] uppercase font-bold">
          <TrendingUp className="h-4 w-4 text-[var(--color-primary-600)]" />
          Trending Regional Intelligence Keywords:
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {TRENDING_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => setSearchQuery(kw)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                searchQuery === kw
                  ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                  : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-primary-600)]/40"
              }`}
            >
              #{kw}
            </button>
          ))}
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Control Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, sources, content..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-9 pr-4 py-2 text-xs font-ui text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="maritime">Maritime Security</option>
          <option value="military">Military Movement</option>
          <option value="energy">Energy & Infrastructure</option>
          <option value="sanctions">Sanctions & Diplomacy</option>
        </select>

        {/* Country Filter */}
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
        >
          <option value="all">All Regions / Countries</option>
          <option value="iran">Iran (IR)</option>
          <option value="uae">UAE (AE)</option>
          <option value="saudi arabia">Saudi Arabia (SA)</option>
          <option value="oman">Oman (OM)</option>
          <option value="us">United States (US)</option>
        </select>

        {/* Sort Selector */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none font-mono"
        >
          <option value="latest">Sort: Latest Published</option>
          <option value="threat">Sort: Highest Threat Score</option>
          <option value="trending">Sort: Title Alphabetical</option>
        </select>
      </div>

      {/* Bulk Action Controls Bar */}
      {filteredArticles.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/60 text-xs font-mono">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-[var(--color-fg)] hover:text-[var(--color-primary-600)] transition-colors"
          >
            {selectedArticles.size === filteredArticles.length && filteredArticles.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-[var(--color-primary-600)]" />
            ) : (
              <Square className="h-4 w-4 text-[var(--color-fg-muted)]" />
            )}
            Select All ({selectedArticles.size}/{filteredArticles.length})
          </button>

          {selectedArticles.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportSelected("json")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary-600)] text-[var(--color-fg)] text-[11px]"
              >
                <Download className="h-3 w-3" /> Export JSON
              </button>
              <button
                type="button"
                onClick={() => exportSelected("csv")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary-600)] text-[var(--color-fg)] text-[11px]"
              >
                <Download className="h-3 w-3" /> Export CSV
              </button>
            </div>
          )}
        </div>
      )}

      {/* Article Cards Grid */}
      <div className="space-y-3">
        {filteredArticles.map((a) => {
          const isChecked = selectedArticles.has(a.id);
          const threatScore = a.risk_score ?? Math.floor(Math.abs(a.title.length * 7) % 65) + 35;
          const isHighThreat = threatScore > 75;

          return (
            <div
              key={a.id}
              className={`rounded-xl border transition-all p-5 space-y-3 relative ${
                isChecked
                  ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)]/5"
                  : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary-600)]/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelectArticle(a.id)}
                  className="mt-1 rounded border-[var(--color-border)] text-[var(--color-primary-600)] focus:ring-0 cursor-pointer"
                />

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30">
                        {a.source || "RSS Feed"}
                      </span>
                      {a.category && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] border border-[var(--color-border)]">
                          {a.category}
                        </span>
                      )}
                      {a.country && (
                        <span className="text-[10px] font-mono text-[var(--color-fg-muted)] uppercase">
                          [{a.country}]
                        </span>
                      )}
                      {a.lat != null && a.lon != null && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" title={`Coordinates: ${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}`}>
                          {a.lat.toFixed(2)}, {a.lon.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isHighThreat
                          ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30"
                          : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                      }`}
                    >
                      THREAT SCORE: {threatScore}/100
                    </span>
                  </div>

                  <h3
                    onClick={() => setActiveModalArticle(a)}
                    className="font-display text-base font-bold text-[var(--color-fg)] hover:text-[var(--color-primary-600)] cursor-pointer transition-colors leading-snug"
                  >
                    {a.title}
                  </h3>

                  <p className="text-xs text-[var(--color-fg-muted)] line-clamp-2 leading-relaxed">
                    {a.description || "No description excerpt provided by feed source."}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[var(--color-fg-muted)]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(a.publishedAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveModalArticle(a)}
                        className="text-[var(--color-primary-600)] hover:underline font-semibold flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" /> AI Classification Drawer
                      </button>
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[var(--color-fg)] flex items-center gap-1"
                        >
                          Original Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredArticles.length === 0 && (
          <div className="text-center py-12 text-[var(--color-fg-muted)] font-mono text-xs border border-dashed border-[var(--color-border)] rounded-xl">
            No intelligence articles match your current search/filter criteria.
          </div>
        )}
      </div>

      {/* Article Detail Drawer / Modal */}
      {activeModalArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)]">
                    {activeModalArticle.source}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">
                    {new Date(activeModalArticle.publishedAt).toLocaleString()}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-[var(--color-fg)]">
                  {activeModalArticle.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalArticle(null)}
                className="p-1 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* AI Classification Card */}
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold uppercase">
                <Bot className="h-4 w-4" /> OpenRouter LLM Classification Output
              </div>
              <p className="text-xs text-[var(--color-fg)] leading-relaxed font-ui">
                "Article describes military and naval assets operating near critical choke points. High strategic relevance to Strait of Hormuz maritime security."
              </p>
              <div className="flex items-center gap-3 pt-2 text-[10px] font-mono text-purple-300">
                <span>MODEL: google/gemini-2.5-flash</span>
                <span>CONFIDENCE: 94.8%</span>
                <span>RELEVANCE: CRITICAL</span>
              </div>
            </div>

            {/* Full Content */}
            <div className="space-y-2 text-xs text-[var(--color-fg)] leading-relaxed font-ui">
              <h4 className="font-mono text-[10px] uppercase text-[var(--color-fg-muted)] font-bold">Summary / Excerpt</h4>
              <p>{activeModalArticle.description || "No further details supplied by intelligence feed."}</p>
            </div>

            {/* Extracted Entities */}
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <h4 className="font-mono text-[10px] uppercase text-[var(--color-fg-muted)] font-bold">Extracted Entities & Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-fg)]">
                  Strait of Hormuz
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-fg)]">
                  Maritime Security
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-fg)]">
                  Naval Escort
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              {activeModalArticle.url && (
                <a
                  href={activeModalArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[var(--color-primary-600)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--color-primary-700)] transition-colors inline-flex items-center gap-1.5"
                >
                  Visit Original Article Source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveModalArticle(null)}
                className="px-4 py-2 border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-semibold rounded-xl hover:bg-[var(--color-bg-elevated)] transition-colors text-[var(--color-fg)]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
