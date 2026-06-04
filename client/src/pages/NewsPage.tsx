import { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Newspaper, ExternalLink, ShieldAlert, Radio, Filter, Clock, MapPin, Search } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pub_date: string;
  source: string;
  summary: string;
}

const KEYWORDS = ["All", "Naval", "Missile", "Drone", "Piracy", "Oil", "Attack", "Security"];
const COUNTRIES = ["All", "Iran", "Yemen", "USA", "UAE", "Oman", "Israel", "China"];

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedKeyword, setSelectedKeyword] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.news) {
          setNews(data.news);
        }
      })
      .catch((err) => console.error("Error fetching news:", err))
      .finally(() => setLoading(false));
  }, []);

  // Filter and sort logic
  const filteredNews = useMemo(() => {
    let result = [...news];

    // Filter by Keyword
    if (selectedKeyword !== "All") {
      const lowerKeyword = selectedKeyword.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(lowerKeyword) || 
        item.summary.toLowerCase().includes(lowerKeyword)
      );
    }

    // Filter by Country
    if (selectedCountry !== "All") {
      const lowerCountry = selectedCountry.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(lowerCountry) || 
        item.summary.toLowerCase().includes(lowerCountry)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.pub_date).getTime();
      const dateB = new Date(b.pub_date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [news, sortOrder, selectedKeyword, selectedCountry]);

  const selectStyle = {
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(148,163,184,0.2)",
    color: "#f8fafc",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
    cursor: "pointer"
  };

  return (
    <div className="page-container fade-up" style={{ paddingBottom: "24px", height: "calc(100vh - 64px - 80px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "16px", flexShrink: 0 }}>
        <div className="section-eyebrow" style={{ marginBottom: "6px" }}>Global Threat Feed</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <h1 className="page-title">Intelligence Briefing</h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(11,18,32,0.8)", border: "1px solid rgba(148,163,184,0.1)", padding: "6px 12px", borderRadius: "6px" }}>
            <Radio size={14} color="#38bdf8" />
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
              Live OSINT Feed
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px",
        background: "linear-gradient(180deg, rgba(11,18,32,0.8) 0%, rgba(8,13,24,0.9) 100%)",
        border: "1px solid rgba(148,163,184,0.1)", padding: "16px", borderRadius: "6px",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
          <Filter size={16} color="#94a3b8" />
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>FILTERS:</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={14} color="#64748b" />
          <select style={selectStyle} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "desc"|"asc")}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Search size={14} color="#64748b" />
          <select style={selectStyle} value={selectedKeyword} onChange={(e) => setSelectedKeyword(e.target.value)}>
            <option disabled value="">Keyword Theme</option>
            {KEYWORDS.map(kw => <option key={kw} value={kw}>{kw}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MapPin size={14} color="#64748b" />
          <select style={selectStyle} value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
            <option disabled value="">Target Country</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          {filteredNews.length} BRIEFINGS MATCHED
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
          Intercepting intelligence streams...
        </div>
      ) : filteredNews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
          No intelligence briefings matched your criteria.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column", gap: "16px" }} className="custom-scrollbar">
          {filteredNews.map((item) => (
            <div 
              key={item.id}
              style={{
                background: "linear-gradient(180deg, rgba(11,18,32,0.9) 0%, rgba(8,13,24,0.95) 100%)",
                border: "1px solid rgba(148,163,184,0.15)",
                borderLeft: "2px solid #38bdf8",
                borderRadius: "4px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              className="hover:-translate-y-1"
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 15px rgba(56,189,248,0.1)";
                e.currentTarget.style.borderLeft = "2px solid #7dd3fc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderLeft = "2px solid #38bdf8";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "4px",
                    background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Newspaper size={14} color="#38bdf8" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.source}
                    </div>
                    <div style={{ fontSize: "0.625rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                      {formatDistanceToNow(new Date(item.pub_date), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", background: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(148,163,184,0.1)", borderRadius: "4px",
                    fontSize: "0.6875rem", fontWeight: 700, color: "#94a3b8",
                    textDecoration: "none", textTransform: "uppercase",
                    fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f8fafc";
                    e.currentTarget.style.borderColor = "rgba(148,163,184,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.borderColor = "rgba(148,163,184,0.1)";
                  }}
                >
                  <ExternalLink size={12} /> Read Full Briefing
                </a>
              </div>

              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 8px 0", lineHeight: 1.4 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.summary.replace(/<[^>]+>/g, '') /* Strip basic HTML if any */}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}