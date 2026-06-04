import { Radar } from "lucide-react";

// ── Tiny primitives ────────────────────────────────────────────────────────

const prose: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.8,
  color: "#94a3b8",
  margin: "0 0 20px",
  maxWidth: "680px",
};

const h2Style: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: 1.25,
  color: "#f8fafc",
  margin: "40px 0 12px",
};

const h3Style: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#e2e8f0",
  margin: "28px 0 8px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        margin: "36px 0",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "0.5px",
          background: "rgba(148,163,184,0.2)",
        }}
      />
      <Radar size={14} color="#475569" />
      <div
        style={{
          flex: 1,
          height: "0.5px",
          background: "rgba(148,163,184,0.2)",
        }}
      />
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "11px",
        padding: "3px 10px",
        border: "0.5px solid rgba(148,163,184,0.3)",
        borderRadius: "999px",
        color: "#64748b",
        marginRight: "6px",
        marginBottom: "6px",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

function TimelineEntry({
  date,
  title,
  body,
  isLatest = false,
}: {
  date: string;
  title: string;
  body: string;
  isLatest?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        marginBottom: "24px",
      }}
    >
      {/* left spine */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: isLatest ? "#f8fafc" : "rgba(148,163,184,0.4)",
            border: isLatest
              ? "2px solid #f8fafc"
              : "2px solid rgba(148,163,184,0.3)",
            flexShrink: 0,
            marginTop: "4px",
          }}
        />
        <div
          style={{
            flex: 1,
            width: "1px",
            background: "rgba(148,163,184,0.15)",
            marginTop: "6px",
          }}
        />
      </div>

      {/* content */}
      <div style={{ paddingBottom: "8px" }}>
        <div
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: isLatest ? "#94a3b8" : "#475569",
            marginBottom: "4px",
          }}
        >
          {date}
        </div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#f8fafc",
            marginBottom: "6px",
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: "#94a3b8",
            margin: 0,
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <article
      className="page-container fade-up"
      style={{ maxWidth: "720px", margin: "0 auto" }}
    >
      {/* ── Header ── */}
      <header style={{ marginBottom: "40px" }}>
        {/* Eyebrow */}
        <div
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "#475569",
            marginBottom: "16px",
          }}
        >
          Open-source intelligence · Persian Gulf
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Radar size={22} color="#818cf8" />
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#f8fafc",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            About HormuzWatch
          </h1>
        </div>

        {/* Lede */}
        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.7,
            color: "#94a3b8",
            margin: "0 0 20px",
            borderLeft: "3px solid rgba(99,102,241,0.5)",
            paddingLeft: "16px",
          }}
        >
          HormuzWatch is a real-time, open-source monitoring platform for the
          Strait of Hormuz — one of the most strategically consequential
          waterways on earth. It tracks both maritime vessels and aircraft using
          public AIS and ADS-B data, around the clock.
        </p>

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            fontSize: "12px",
            color: "#475569",
            borderTop: "0.5px solid rgba(148,163,184,0.2)",
            borderBottom: "0.5px solid rgba(148,163,184,0.2)",
            padding: "10px 0",
          }}
        >
          <span>Founded Q4 2025</span>
          <span style={{ color: "rgba(148,163,184,0.3)" }}>·</span>
          <span>Public beta Q2 2026</span>
          <span style={{ color: "rgba(148,163,184,0.3)" }}>·</span>
          <span>Persian Gulf · Gulf of Oman</span>
        </div>
      </header>

      {/* ── Why we built this ── */}
      <section>
        <h2 style={h2Style}>Why we built this</h2>
        <p style={prose}>
          The Strait of Hormuz is a 21-mile-wide chokepoint through which
          roughly a fifth of the world's oil supply passes every day. It is
          surrounded by nations with competing interests, patrolled by rival
          navies, and crossed by thousands of commercial vessels each month.
          What happens there matters — economically, geopolitically, and for
          global security.
        </p>
        <p style={prose}>
          Yet most people have no visibility into it. Official information is
          slow, filtered, or simply unavailable. Commercial maritime
          intelligence is expensive and opaque. We built HormuzWatch because we
          believe that in an era of information warfare, independent, open
          monitoring is not a luxury — it's a necessity.
        </p>
        <p style={prose}>
          Our platform aggregates open-source intelligence from public AIS and
          ADS-B feeds, processes it in near real-time, and makes it freely
          accessible to researchers, journalists, policymakers, and concerned
          citizens worldwide.
        </p>
      </section>

      <Divider />

      {/* ── What we track ── */}
      <section>
        <h2 style={h2Style}>What we track</h2>
        <p style={prose}>
          HormuzWatch operates across two domains simultaneously.
        </p>

        <h3 style={h3Style}>Maritime</h3>
        <p style={prose}>
          Every vessel broadcasting an AIS signal — tankers, container ships,
          naval vessels, tugboats, coast guard craft — appears on our map within
          seconds of transmission. We cover the full span of the Strait, the
          Persian Gulf, and the Gulf of Oman, with specialized layers for
          shipping lanes and territorial water boundaries.
        </p>

        <h3 style={h3Style}>Aerial</h3>
        <p style={prose}>
          Via the OpenSky Network, we ingest ADS-B transponder data for
          commercial flights, cargo aircraft, military planes, and private jets
          transiting the region. Combined with maritime data, this gives a
          complete picture of activity that no single domain view can provide.
        </p>
      </section>

      <Divider />

      {/* ── How it works ── */}
      <section>
        <h2 style={h2Style}>How it works</h2>
        <p style={prose}>
          The pipeline is straightforward by design. Every 30 to 60 seconds, our
          backend polls AISHub and the OpenSky Network APIs. Go routines
          normalize the raw NMEA and ASTERIX formats into GeoJSON, a Redis layer
          caches the result to absorb traffic spikes, and WebSocket connections
          push the update to every connected browser — all within a target
          latency of under 60 seconds from signal to screen.
        </p>
        <p style={prose}>
          For clients that can't maintain a WebSocket connection, a REST
          fallback is always available. Historical data is retained for
          playback, so you can reconstruct the state of the Strait at any point
          in time — useful for incident analysis and trend research.
        </p>
        <p style={prose}>
          The infrastructure is built to stay up when it matters most. A
          Redis-backed architecture and Docker-containerized services give us
          the headroom to absorb the traffic spikes that accompany breaking
          geopolitical events.
        </p>

        {/* Tech tags */}
        <div style={{ marginTop: "4px" }}>
          {[
            "Go 1.21",
            "Gin",
            "Redis",
            "React 18",
            "TypeScript",
            "Mapbox GL",
            "Docker",
            "WebSocket",
          ].map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Community ── */}
      <section>
        <h2 style={h2Style}>Community & data</h2>
        <p style={prose}>
          None of this would be possible without the global network of hobbyists
          and researchers who run AIS and ADS-B receivers and share their data
          publicly. They are the real infrastructure behind HormuzWatch.
        </p>
        <p style={prose}>
          We are committed to keeping this platform open. The data we display is
          sourced exclusively from public feeds — no proprietary or classified
          sources. Everything you see, anyone can verify independently.
        </p>
      </section>

      <Divider />

      {/* ── Timeline ── */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ ...h2Style, marginBottom: "28px" }}>How we got here</h2>

        <TimelineEntry
          date="Q4 2025"
          title="Concept & first prototype"
          body="Rising tensions in the Strait of Hormuz made the lack of accessible, real-time public data impossible to ignore. We built a rough prototype using AISHub data and proved the approach was viable."
        />
        <TimelineEntry
          date="Q1 2026"
          title="Dual-domain expansion"
          body="We integrated the OpenSky Network API and added full aerial tracking. For the first time, maritime and aerial activity in the region could be viewed side-by-side in a single interface."
        />
        <TimelineEntry
          date="Q2 2026 — now"
          title="Public beta"
          body="HormuzWatch opens to the public. Live WebSocket updates, historical playback, and a regional alert system go live. This is just the beginning."
          isLatest
        />
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "0.5px solid rgba(148,163,184,0.2)",
          paddingTop: "20px",
          fontSize: "12px",
          color: "#475569",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: "0 0 6px" }}>
          HormuzWatch is an independent, open-source project. All data is
          sourced from public AIS and ADS-B feeds. We have no affiliation with
          any government, military organization, or commercial intelligence
          provider.
        </p>
        <p style={{ margin: 0, color: "#334155" }}>
          Strait of Hormuz · Persian Gulf · Gulf of Oman · Est. 2025
        </p>
      </footer>
    </article>
  );
}
