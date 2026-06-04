import { useState, useEffect } from "react";
import {
  Save,
  ShieldAlert,
  Database,
  Radio,
  Radar,
  Flame,
  Newspaper,
  BookmarkCheck,
  Settings as SettingsIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface SettingsState {
  retention_days: number;
  opensky_enabled: boolean;
  aisstream_enabled: boolean;
  auto_watchlist_threshold: number;
  heatmap_enabled: boolean;
  news_enabled: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    retention_days: 30,
    opensky_enabled: true,
    aisstream_enabled: true,
    auto_watchlist_threshold: 75,
    heatmap_enabled: true,
    news_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
      })
      .catch((err) => console.error("Failed to load settings", err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage("All settings saved successfully.");
        setMessageType("success");
      } else {
        setMessage("Failed to save settings.");
        setMessageType("error");
      }
    } catch {
      setMessage("Network error saving settings.");
      setMessageType("error");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const toggleStyle = (enabled: boolean): React.CSSProperties => ({
    width: "44px",
    height: "24px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    background: enabled
      ? "linear-gradient(135deg, #4f46e5, #6366f1)"
      : "rgba(148,163,184,0.15)",
    position: "relative",
    transition: "background 0.3s ease",
    flexShrink: 0,
  });

  const toggleDotStyle = (enabled: boolean): React.CSSProperties => ({
    position: "absolute",
    top: "3px",
    left: enabled ? "22px" : "3px",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "#fff",
    transition: "left 0.2s ease",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  });

  const sectionCard: React.CSSProperties = {
    background: "rgba(11,18,32,0.6)",
    border: "1px solid rgba(148,163,184,0.1)",
    borderRadius: "8px",
    padding: "24px",
  };

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "20px",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "#f8fafc",
          letterSpacing: "0.04em",
        }}
      >
        {title}
      </span>
    </div>
  );

  const settingRow = (
    label: string,
    description: string,
    control: React.ReactNode
  ) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid rgba(148,163,184,0.06)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "0.875rem",
            color: "#e2e8f0",
            fontWeight: 600,
            marginBottom: "2px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#64748b",
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
      {control}
    </div>
  );

  return (
    <div className="page-container fade-up" style={{ paddingBottom: "40px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div className="section-eyebrow" style={{ marginBottom: "6px" }}>
          System Configuration
        </div>
        <h1 className="page-title">Settings</h1>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          maxWidth: "960px",
        }}
      >
        {/* Data Retention */}
        <div style={sectionCard}>
          {sectionTitle(
            <Database size={18} color="#6366f1" />,
            "Data Retention"
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#94a3b8",
                fontSize: "0.8125rem",
                marginBottom: "10px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span>Retention Period</span>
              <span style={{ color: "#f8fafc", fontWeight: 700 }}>
                {settings.retention_days} Days
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="90"
              value={settings.retention_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  retention_days: Number(e.target.value),
                })
              }
              style={{
                width: "100%",
                cursor: "pointer",
                accentColor: "#6366f1",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#475569",
                fontSize: "0.6875rem",
                marginTop: "6px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span>1 Day</span>
              <span>90 Days</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: "6px",
              padding: "12px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <ShieldAlert
              size={16}
              color="#ef4444"
              style={{ marginTop: "2px", flexShrink: 0 }}
            />
            <p
              style={{
                color: "#cbd5e1",
                fontSize: "0.75rem",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Watchlisted objects are exempt from retention purges.
            </p>
          </div>
        </div>

        {/* Auto Watchlist */}
        <div style={sectionCard}>
          {sectionTitle(
            <BookmarkCheck size={18} color="#22c55e" />,
            "Threat Auto-Watchlist"
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#94a3b8",
                fontSize: "0.8125rem",
                marginBottom: "10px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span>Score Threshold</span>
              <span style={{ color: "#f8fafc", fontWeight: 700 }}>
                ≥ {settings.auto_watchlist_threshold}
              </span>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.auto_watchlist_threshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  auto_watchlist_threshold: Number(e.target.value),
                })
              }
              style={{
                width: "100%",
                cursor: "pointer",
                accentColor: "#22c55e",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#475569",
                fontSize: "0.6875rem",
                marginTop: "6px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span>10 (Sensitive)</span>
              <span>100 (Critical Only)</span>
            </div>
          </div>

          <p
            style={{
              color: "#64748b",
              fontSize: "0.75rem",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Tracks scoring at or above this threshold will be automatically
            added to your watchlist for long-term monitoring.
          </p>
        </div>

        {/* Integration Toggles */}
        <div style={{ ...sectionCard, gridColumn: "1 / -1" }}>
          {sectionTitle(
            <Radio size={18} color="#38bdf8" />,
            "Data Source Integrations"
          )}

          {settingRow(
            "OpenSky Network (Aviation)",
            "Live ADS-B aircraft tracking via OpenSky REST API",
            <button
              style={toggleStyle(settings.opensky_enabled)}
              onClick={() =>
                setSettings({
                  ...settings,
                  opensky_enabled: !settings.opensky_enabled,
                })
              }
            >
              <div style={toggleDotStyle(settings.opensky_enabled)} />
            </button>
          )}

          {settingRow(
            "AISStream (Maritime Vessels)",
            "Live AIS vessel tracking via AISStream WebSocket",
            <button
              style={toggleStyle(settings.aisstream_enabled)}
              onClick={() =>
                setSettings({
                  ...settings,
                  aisstream_enabled: !settings.aisstream_enabled,
                })
              }
            >
              <div style={toggleDotStyle(settings.aisstream_enabled)} />
            </button>
          )}

          {settingRow(
            "Heatmap Overlay",
            "Anomaly density heat visualization on the dashboard map",
            <button
              style={toggleStyle(settings.heatmap_enabled)}
              onClick={() =>
                setSettings({
                  ...settings,
                  heatmap_enabled: !settings.heatmap_enabled,
                })
              }
            >
              <div style={toggleDotStyle(settings.heatmap_enabled)} />
            </button>
          )}

          {settingRow(
            "Intelligence News Feeds",
            "Automated RSS/GDELT intelligence news aggregation",
            <button
              style={toggleStyle(settings.news_enabled)}
              onClick={() =>
                setSettings({
                  ...settings,
                  news_enabled: !settings.news_enabled,
                })
              }
            >
              <div style={toggleDotStyle(settings.news_enabled)} />
            </button>
          )}
        </div>
      </div>

      {/* Save Bar */}
      <div
        style={{
          marginTop: "24px",
          maxWidth: "960px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(11,18,32,0.6)",
          border: "1px solid rgba(148,163,184,0.1)",
          borderRadius: "8px",
          padding: "16px 24px",
        }}
      >
        {message ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: messageType === "success" ? "#22c55e" : "#ef4444",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            {messageType === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <XCircle size={16} />
            )}
            {message}
          </div>
        ) : (
          <span style={{ color: "#475569", fontSize: "0.8125rem" }}>
            Changes require a save to take effect.
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "10px 24px",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 16px rgba(79,70,229,0.3)",
          }}
        >
          {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
