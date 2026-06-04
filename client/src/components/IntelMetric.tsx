import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function IntelMetric({ 
  label, 
  value, 
  trend, 
  sub,
  icon: Icon, 
  color, 
  bg, 
  isThreat 
}: {
  label: string;
  value: string | number;
  trend?: number;
  sub?: string;
  icon: any;
  color?: string;
  bg?: string;
  isThreat?: boolean;
}) {
  const displayColor = isThreat ? color || "#ef4444" : "#64748b";
  const displayBg = isThreat ? bg || "rgba(239,68,68,0.1)" : "rgba(100,116,139,0.1)";
  const strokeColor = isThreat ? "%23ef4444" : "%2364748b";

  // Topographical map outline background
  const topoBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cpath d='M0,50 Q40,30 80,60 T160,50 T200,80 M-20,90 Q40,70 80,100 T160,90 T220,120 M0,130 Q40,110 80,140 T160,130 T200,160 M20,10 Q60,-10 100,20 T180,10 T220,40' fill='none' stroke='${strokeColor}' stroke-width='0.5' opacity='0.4'/%3E%3C/svg%3E")`;

  return (
    <div style={{
      position: "relative",
      background: `linear-gradient(180deg, rgba(11,18,32,0.95) 0%, rgba(8,13,24,0.95) 100%)`,
      border: `1px solid ${isThreat ? "rgba(239,68,68,0.3)" : "rgba(100,116,139,0.2)"}`,
      borderTop: `2px solid ${displayColor}`,
      borderRadius: "4px",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      overflow: "hidden",
      boxShadow: isThreat ? "0 0 15px rgba(239,68,68,0.15)" : "0 0 10px rgba(100,116,139,0.05)",
      flex: 1
    }} className="hover:-translate-y-1 transition-transform">
      {/* Background map outline */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: topoBg,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: isThreat ? 0.3 : 0.15,
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "6px",
            background: displayBg, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 8px ${displayBg}`
          }}>
            <Icon size={16} color={displayColor} />
          </div>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
            {label}
          </span>
        </div>
      </div>
      
      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "2rem", fontWeight: 800, color: isThreat ? "#f8fafc" : "#cbd5e1", lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", textShadow: isThreat ? "0 0 10px rgba(239,68,68,0.3)" : "none" }}>
          {value}
        </div>
        
        {trend !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
            {trend > 0 ? <TrendingUp size={14} color={isThreat ? "#ef4444" : "#94a3b8"} /> : trend < 0 ? <TrendingDown size={14} color={isThreat ? "#22c55e" : "#94a3b8"} /> : <Minus size={14} color="#64748b" />}
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isThreat ? (trend > 0 ? "#ef4444" : "#22c55e") : "#94a3b8" }}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}

        {sub && !trend && (
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isThreat ? displayColor : "#64748b", marginBottom: "4px" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
