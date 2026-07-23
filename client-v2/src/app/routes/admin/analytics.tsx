import { TrendingUp, FileText, Download, PieChart, Activity } from "lucide-react";
import { PageTodoList, type TodoItem } from "@/components/ui/PageTodoList";

const ANALYTICS_TODOS: TodoItem[] = [
  { id: "y1", title: "Regional Threat Density & Category Charts", category: "UI & UX", completed: true, notes: "Visual progress bar density & category article distribution" },
  { id: "y2", title: "Automated PDF Executive Briefing Generator", category: "API & Data", completed: false, notes: "Connect jsPDF / html2canvas to generate downloadable PDF summaries" },
  { id: "y3", title: "OSINT Source Reliability Scatter Matrix", category: "ML & Anomaly", completed: false, notes: "Scatter plot comparing scrape volume against HTTP error rate per feed" },
  { id: "y4", title: "Choropleth Threat Heatmap Integration", category: "UI & UX", completed: false, notes: "Shaded country map visualization reflecting real-time threat scores" },
];

export default function AdminAnalytics() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Analytics & Strategic Reports</h1>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Regional threat trends, anomaly detection metrics, and OSINT source reliability analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {}}
          className="px-3 py-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white text-xs font-ui font-semibold rounded-lg flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Download className="h-4 w-4" /> Export Briefing PDF
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>24h Threat Score Avg</span>
            <TrendingUp className="h-4 w-4 text-[var(--color-warning)]" />
          </div>
          <p className="font-display text-2xl font-bold text-[var(--color-fg)]">74.2 / 100</p>
          <p className="text-[11px] font-mono text-[var(--color-warning)]">+4.8% from yesterday</p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>Ingested OSINT Articles</span>
            <FileText className="h-4 w-4 text-[var(--color-primary-600)]" />
          </div>
          <p className="font-display text-2xl font-bold text-[var(--color-fg)]">1,420</p>
          <p className="text-[11px] font-mono text-[var(--color-success)]">98.4% parse success</p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>AIS / ADS-B Anomalies</span>
            <Activity className="h-4 w-4 text-red-500" />
          </div>
          <p className="font-display text-2xl font-bold text-[var(--color-fg)]">38 Flagged</p>
          <p className="text-[11px] font-mono text-red-500">12 High Anomaly Vectors</p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)] font-ui">
            <span>Source Reliability</span>
            <PieChart className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="font-display text-2xl font-bold text-[var(--color-fg)]">92.1%</p>
          <p className="text-[11px] font-mono text-[var(--color-fg-muted)]">Across 24 active feeds</p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Regional Threat Density Distribution */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Regional Threat Density</h3>
            <span className="font-mono text-xs text-[var(--color-fg-muted)]">LAST 7 DAYS</span>
          </div>
          <div className="space-y-3 pt-2">
            {[
              { label: "Strait of Hormuz (North)", val: "84%", color: "bg-red-500" },
              { label: "Gulf of Oman (East)", val: "62%", color: "bg-amber-500" },
              { label: "Bandar Abbas Sector", val: "48%", color: "bg-blue-500" },
              { label: "Persian Gulf Central", val: "25%", color: "bg-emerald-500" },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-ui">
                  <span className="text-[var(--color-fg)] font-semibold">{item.label}</span>
                  <span className="font-mono text-[var(--color-fg-muted)]">{item.val}</span>
                </div>
                <div className="w-full bg-[var(--color-bg)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                  <div className={`${item.color} h-full rounded-full`} style={{ width: item.val }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Category Breakdown */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="font-display text-base font-bold text-[var(--color-fg)]">Intelligence Category Breakdown</h3>
            <span className="font-mono text-xs text-[var(--color-fg-muted)]">ARTICLES</span>
          </div>
          <div className="space-y-3 pt-2">
            {[
              { label: "Naval / Maritime Operations", count: "482 articles", pct: "34%" },
              { label: "Geopolitical & Diplomatic", count: "390 articles", pct: "27%" },
              { label: "Sanctions & Maritime Law", count: "310 articles", pct: "22%" },
              { label: "Airspace Surveillance", count: "238 articles", pct: "17%" },
            ].map(cat => (
              <div key={cat.label} className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-ui">
                <span className="font-semibold text-[var(--color-fg)]">{cat.label}</span>
                <div className="text-right">
                  <span className="font-mono text-[var(--color-primary-600)] font-bold">{cat.pct}</span>
                  <span className="text-[10px] font-mono text-[var(--color-fg-muted)] block">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TODO List Component */}
      <PageTodoList pageTitle="Analytics & Strategic Reports" items={ANALYTICS_TODOS} />
    </div>
  );
}
