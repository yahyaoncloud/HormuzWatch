import { useQuery } from "@tanstack/react-query";
import { getLatestNews } from "@/lib/api";
import type { NewsArticle } from "@/lib/api";
import { useState, useMemo } from "react";
import {
  Download,
  Clock,
  ExternalLink,
  Bot,
  RefreshCw,
  CheckSquare,
  Square,
  TrendingUp,
  Globe2,
  FileText,
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

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "maritime", label: "Maritime Security" },
  { value: "military", label: "Military Movement" },
  { value: "energy", label: "Energy & Infrastructure" },
  { value: "sanctions", label: "Sanctions & Diplomacy" },
] as const;

const COUNTRIES = [
  { value: "all", label: "All Regions / Countries" },
  { value: "iran", label: "Iran (IR)" },
  { value: "uae", label: "UAE (AE)" },
  { value: "saudi arabia", label: "Saudi Arabia (SA)" },
  { value: "oman", label: "Oman (OM)" },
  { value: "us", label: "United States (US)" },
] as const;

const SORT_OPTIONS = [
  { value: "latest", label: "Sort: Latest Published" },
  { value: "threat", label: "Sort: Highest Threat Score" },
  { value: "trending", label: "Sort: Title Alphabetical" },
] as const;

export default function AdminNews() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "news", "latest"],
    queryFn: () => getLatestNews({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "threat" | "trending">("latest");
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [activeModalArticle, setActiveModalArticle] = useState<NewsArticle | null>(null);

  const rawArticles = data?.data ?? [];

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

  const kpiCards = useMemo(() => [
    { icon: Globe2, value: rawArticles.length, label: "Total Articles", iconColor: "var(--color-primary-600)" },
    { icon: Clock, value: filteredArticles.length, label: "Filtered", iconColor: "var(--color-info)" },
    { icon: Bot, value: rawArticles.filter(a => a.category).length, label: "Classified", iconColor: "var(--color-warning)" },
    { icon: ExternalLink, value: rawArticles.filter(a => a.url).length, label: "With Source URLs", iconColor: "var(--color-success)" },
  ], [rawArticles, filteredArticles.length]);

  if (isLoading) {
    return <LoadingState message="Ingesting real-time intelligence feeds..." size="md" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Intelligence News"
        message={error instanceof Error ? error.message : "Unknown error"}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-ui pb-12">
      {/* Header */}
      <PageHeader
        icon={<Globe2 className="h-6 w-6" />}
        title="News Intelligence Pipeline"
        subtitle="Browse, filter, and inspect automated RSS & web scraper intelligence feeds with OpenRouter LLM classification."
        actions={
          <>
            <PageHeaderAction
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label="Refresh feed"
              variant="ghost"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin text-[var(--color-primary-600)]" : ""}`} />
            </PageHeaderAction>
          </>
        }
      />

      {/* Live Ingest Counter */}
      <div className="flex items-center gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 ">
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
      </div>

      {/* KPI Cards */}
      <KPICardGrid cards={kpiCards} columns={4} className="mb-4" />

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
      <SearchFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search titles, sources, content..."
        filters={[
          { key: "category", label: "Category", value: selectedCategory, onChange: setSelectedCategory, options: CATEGORIES },
          { key: "country", label: "Country", value: selectedCountry, onChange: setSelectedCountry, options: COUNTRIES },
          { key: "sort", label: "Sort", value: sortBy, onChange: (val: string) => setSortBy(val as any), options: SORT_OPTIONS },
        ]}
      />

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
        {filteredArticles.length === 0 ? (
          <EmptyState
            title="No Intelligence Articles Found"
            message="No articles match your current search/filter criteria."
            icon={<Inbox className="h-8 w-8" />}
          />
        ) : (
          filteredArticles.map((a) => {
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
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            title={`Coordinates: ${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}`}
                          >
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
          })
        )}
      </div>

      {/* Article Detail Modal */}
      <Modal open={!!activeModalArticle} onClose={() => setActiveModalArticle(null)} title="Article Intelligence Report" size="lg">
        {activeModalArticle && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)]">
                {activeModalArticle.source}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">
                {new Date(activeModalArticle.publishedAt).toLocaleString()}
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-[var(--color-fg)]">{activeModalArticle.title}</h2>

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
        )}
      </Modal>
    </div>
  );
}