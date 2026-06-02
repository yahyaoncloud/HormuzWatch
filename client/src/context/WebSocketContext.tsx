import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface Track {
  id: string;
  name: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  anomalyScore: number;
  severity: "low" | "medium" | "high" | "critical";
  lastUpdate: string;
}

export interface AnomalyData {
  id: string;
  score: number;
  severity: string;
  reasons: string[];
  actions: string[];
}

export interface HeatmapCell {
  lat: number;
  lon: number;
  intensity: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  tracks: Map<string, Track>;
  anomalies: Map<string, AnomalyData>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

const INITIAL_RECONNECT_DELAY = 1000;   // 1 second
const MAX_RECONNECT_DELAY = 30000;       // 30 seconds
const RECONNECT_JITTER = 500;            // ±500ms jitter to avoid thundering herd

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [tracks, setTracks] = useState<Map<string, Track>>(new Map());
  const [anomalies, setAnomalies] = useState<Map<string, AnomalyData>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    function connect() {
      if (!isMounted.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl =
        import.meta.env.VITE_WS_URL || `${protocol}//${host}/api/ws/stream`;

      console.log(`[WebSocket] Connecting to ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) return;
        setIsConnected(true);
        reconnectDelay.current = INITIAL_RECONNECT_DELAY; // Reset backoff on success
        console.log("[WebSocket] Connected.");
        
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (!isMounted.current) return;
        try {
          const lines = event.data.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            const message = JSON.parse(line);

            // Ignore server-side pong responses
            if (message.type === "pong" || message.type === "ping") continue;

            if (message.type === "telemetry") {
              const track: Track = {
                id: message.data.trackId || message.data.id,
                name: message.data.assetName || message.data.name,
                lat: message.data.lat,
                lon: message.data.lon,
                speed: message.data.speed,
                heading: message.data.heading,
                anomalyScore: 0,
                severity: "low",
                lastUpdate: new Date().toISOString(),
              };
              setTracks((prev) => new Map(prev).set(track.id, track));
            } else if (message.type === "anomaly") {
              const anomaly: AnomalyData = message.data;
              setAnomalies((prev) => new Map(prev).set(anomaly.id, anomaly));
              setTracks((prev) => {
                const updated = new Map(prev);
                const track = updated.get(anomaly.id);
                if (track) {
                  track.anomalyScore = anomaly.score;
                  track.severity = anomaly.severity as "low" | "medium" | "high" | "critical";
                }
                return updated;
              });
            }
          }
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err, event.data);
        }
      };

      ws.onerror = (err) => {
        console.error("[WebSocket] Error:", err);
      };

      ws.onclose = (event) => {
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        if (!isMounted.current) return;
        setIsConnected(false);
        wsRef.current = null;

        // Don't reconnect if it was a clean intentional close (code 1000)
        if (event.code === 1000) {
          console.log("[WebSocket] Closed cleanly.");
          return;
        }

        const jitter = Math.random() * RECONNECT_JITTER;
        const delay = reconnectDelay.current + jitter;
        console.log(
          `[WebSocket] Disconnected (code=${event.code}). Reconnecting in ${Math.round(delay)}ms...`,
        );

        reconnectTimer.current = setTimeout(() => {
          // Exponential backoff: double the delay up to the max
          reconnectDelay.current = Math.min(
            reconnectDelay.current * 2,
            MAX_RECONNECT_DELAY,
          );
          connect();
        }, delay);
      };
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isConnected && !wsRef.current) {
        console.log("[WebSocket] Tab visible, reconnecting...");
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    connect();

    return () => {
      isMounted.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Component unmounted");
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ isConnected, tracks, anomalies }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}
