import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Prose, ProseBarChart, ProseHorizontalBarChart } from '@/components/ui/prose';

const ML_CHARTS = {
  distribution: [
    -0.42, -0.38, -0.35, -0.33, -0.31, -0.29, -0.28, -0.27, -0.26, -0.25, -0.24, -0.24, -0.23,
    -0.23, -0.22, -0.22, -0.21, -0.21, -0.2, -0.2, -0.19, -0.19, -0.18, -0.18, -0.17, -0.17, -0.16,
    -0.15, -0.14, -0.13, -0.12, -0.11, -0.1, -0.09, -0.08, -0.07, -0.06, -0.05, -0.04, -0.03, -0.02,
    -0.01, 0.0, 0.0, 0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1,
    0.1, 0.11, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23,
    0.24, 0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.33, 0.35, 0.37, 0.39, 0.41, 0.43, 0.45, 0.47,
  ],
  featureImportance: [
    { name: 'Course Deviation (Δ°)', importance: 0.34 },
    { name: 'AIS Signal Age (min)', importance: 0.28 },
    { name: 'Hot-Zone Proximity (Nm)', importance: 0.22 },
    { name: 'Speed Anomaly (kn)', importance: 0.18 },
    { name: 'Historical Track Score', importance: 0.16 },
    { name: 'Hour of Day', importance: 0.11 },
    { name: 'Vessel Type Encoding', importance: 0.09 },
    { name: 'Traffic Density (local)', importance: 0.07 },
  ],
};

export default function LearnIndex() {
  return (
    <>
      {/* ── Introduction ──────────────────────────────────────────── */}
      <Section id="introduction" level={1} title="Documentation" subtitle="A written record of how HormuzWatch sees the world's waterways">
        <Prose>
          <p>
            HormuzWatch is a documentation-first strategic intelligence publication. It is not a
            dashboard you watch; it is a record you read. Every day it quietly fuses open vessel and
            aircraft telemetry, geopolitical event streams, satellite fire detection, weather, and
            news into one continuously updated narrative about the chokepoints that move the global
            economy.
          </p>
          <p>
            We built it because the waterways that carry a fifth of the world's oil and an enormous
            share of container trade are also among the least legible to the public. National agencies
            and well-funded analysts see them in real time; everyone else reads about them only after
            a crisis.
          </p>

          <blockquote>
            This page is the spine of the documentation. It explains what the project is, how the
            pipeline is assembled, where the data comes from, and how an anomalous vessel becomes a
            sentence in a report rather than a red dot on a map.
          </blockquote>

          <h3>The short version</h3>
          <ol>
            <li>We ingest public telemetry about ships (AIS) and aircraft (ADS-B), then check each track against the geography of restricted and high-risk zones.</li>
            <li>A transparent composite score combines course deviation, signal age, speed, distance to hot zones, restricted-zone presence, and proximity to historical attacks into a severity tier.</li>
            <li>A machine-learning ensemble — Isolation Forest, Local Outlier Factor, and isotonic calibration — turns that score into a calibrated probability, with SHAP values that explain why.</li>
            <li>The result is written down: an editorial, continuously updated account of the corridors, not a control room.</li>
          </ol>
        </Prose>
      </Section>

      {/* ── What is HW ─────────────────────────────────────────────── */}
      <Section id="what-is" title="What HormuzWatch is" subtitle="Documentation first, maps second">
        <Prose>
          <p>
            Most maritime-domain-awareness tools are built as operations centers: a wall of maps, a
            stream of alerts, an analyst glued to the screen. HormuzWatch is deliberately the
            opposite. The primary artifact is the text.
          </p>
          <p>
            This is a philosophical choice, not a stylistic one. Reading is the durable form of
            understanding. A live track disappears in seconds; a well-written explanation of why a
            pattern matters persists. By treating documentation as the main output, we are forced to
            make the system explainable.
          </p>
          <p>
            Concretely, that means the on-page experience is long-form and scrollable. You read a
            section, and if a map or a metric helps, it is embedded right there beside the prose.
          </p>
        </Prose>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="default"><a href="/about">Read the mission</a></Button>
          <Button asChild variant="outline"><a href="/intelligence">Open the intelligence record</a></Button>
        </div>
      </Section>

      {/* ── Architecture ───────────────────────────────────────────── */}
      <Section id="architecture" title="Architecture" subtitle="Three layers, one narrative">
        <Prose>
          <p>HormuzWatch is composed of three independent layers that communicate over narrow, well-defined boundaries. Each layer can be reasoned about, tested, and replaced on its own.</p>
        </Prose>

        <div className="grid grid-cols-1 gap-0 mt-4 border border-[var(--color-border)]">
          {[
            { title: 'Go Backend', subtitle: 'Gin REST + WebSocket hub + 6 workers', body: 'The nervous system. Six integration workers pull AIS, ADS-B, GDELT, FIRMS, Open-Meteo, and RSS news. REST API serves state; WebSocket streams deltas. Anomaly scoring (geofence + composite) runs server-side.' },
            { title: 'Python ML Service', subtitle: 'FastAPI + gRPC, multi-domain ensemble', body: 'Returns calibrated probability per domain. Isolation Forest + LOF + isotonic calibration for vessel, aviation, and heatmap models. SHAP TreeExplainer for feature attribution on every prediction.' },
            { title: 'React Frontend', subtitle: 'React Router v7, MapLibre GL, Zustand', body: 'A reader, not a control room. Consumes REST + WebSocket. Renders long-form editorial pages with embedded Leaflet maps, uPlot model charts, and inline analytics. 2D maps only — no surveillance theatre.' },
          ].map((arch, i) => (
            <Card key={arch.title} className={i > 0 ? 'border-t-0' : ''}>
              <CardHeader>
                <CardTitle className="text-[var(--color-primary-600)]">{arch.title}</CardTitle>
                <CardDescription>{arch.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
                <p>{arch.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Prose>
          <p className="mt-4">
            The contract between them is simple. Backend → frontend is REST plus WebSocket.
            Backend → ML is a synchronous <code>POST /api/predict</code> with engineered features
            and a probability back. Nothing else is shared.
          </p>
        </Prose>
      </Section>

      {/* ── Data Sources ───────────────────────────────────────────── */}
      <Section id="data-sources" title="Data Sources" subtitle="Six open or commercial feeds, normalized into one record">
        <Prose>
          <p>Every figure in HormuzWatch begins as a feed. We deliberately prefer open and well-documented sources so the record can be audited.</p>

          <h3>AIS — Vessel Telemetry</h3>
          <p>Automatic Identification System transponder messages provide vessel identity (MMSI, IMO, callsign), navigation status, position, course, speed, heading, and destination. Ingested via AISStream WebSocket at ~5,000 messages per minute. Signal loss, spoofing, and AIS gaps are treated as analytically meaningful rather than discarded.</p>

          <h3>ADS-B — Aircraft Telemetry</h3>
          <p>Automatic Dependent Surveillance–Broadcast transmissions report ICAO address, callsign, position, altitude, speed, and vertical rate. Polled from OpenSky Network REST API every 3 minutes for the Gulf region. Coverage is less complete than AIS, but the presence or sudden absence of air traffic is frequently the earliest observable signal of an emerging incident.</p>

          <h3>GDELT — Geopolitical Events</h3>
          <p>The Global Database of Events, Language, and Tone monitors broadcast, print, and web news in 100+ languages. Queried every 5 minutes for Gulf region events using the CAMEO taxonomy. Provides the structural context distinguishing a routine vessel deviation from one against a backdrop of regional tension.</p>

          <h3>NASA FIRMS — Fire Detection</h3>
          <p>Active fire and thermal anomaly data from MODIS and VIIRS satellite instruments. Polled every 15 minutes. An unexpected thermal hotspot — explosion, shipboard fire, oil platform incident — is a high-signal event feeding both the heatmap layer and anomaly pipeline.</p>

          <h3>Open-Meteo — Marine Weather</h3>
          <p>Wave height, wind speed, visibility, sea-level pressure at 1-hour resolution. Fetch every 30 minutes. Critical contextual variable: storm-driven course deviations should not inflate anomaly scores.</p>

          <h3>RSS — Maritime Security News</h3>
          <p>Curated feeds from UKMTO, IMB Piracy Reporting Centre, EU NAVFOR, CMF/IMSC, and major wire services. Polled every 2 minutes via <code>gofeed</code>. News serves as ground truth: a behavioral anomaly corroborated by a contemporaneous news report has higher confidence.</p>
        </Prose>

        <ProseBarChart
          title="Ingestion Volume by Source (records/hour)"
          data={[
            { label: 'AIS', value: 4800, color: 'var(--color-primary-600)' },
            { label: 'ADS-B', value: 1200, color: 'var(--color-info)' },
            { label: 'GDELT', value: 280, color: 'var(--color-warning)' },
            { label: 'FIRMS', value: 40, color: 'var(--color-danger)' },
            { label: 'Weather', value: 12, color: 'var(--color-warning)' },
            { label: 'RSS', value: 60, color: 'var(--color-success)' },
          ]}
          height={120}
        />
      </Section>

      {/* ── Detection Pipeline ─────────────────────────────────────── */}
      <Section id="detection" title="Detection Pipeline" subtitle="From raw ping to written verdict">
        <Prose>
          <p>The detection pipeline is a straight line with one branch into machine learning. Each step is small and inspectable.</p>
          <ol>
            <li><strong>Ingest</strong> — Workers pull each feed, parse, normalize into common schema.</li>
            <li><strong>Geofence</strong> — Every track tested against restricted and high-risk zone polygons.</li>
            <li><strong>Composite Score</strong> — Human-readable signals: course delta, AIS age, speed outliers, hot-zone distance, restricted presence, attack proximity.</li>
            <li><strong>Severity</strong> — Score bucketed into Critical (75-100), High (55-74), Medium (30-54), Low (0-29).</li>
            <li><strong>ML Ensemble</strong> — Engineered features sent to Python service; returns calibrated probability and SHAP values.</li>
          </ol>
          <p>The whole pipeline runs continuously — a vessel that was Low at noon can be High by 12:15.</p>
        </Prose>
      </Section>

      {/* ── Scoring ────────────────────────────────────────────────── */}
      <Section id="scoring" title="Anomaly Scoring" subtitle="The features behind every tier">
        <Prose>
          <p>The composite score is deliberately boring and transparent. It is a weighted combination of features a mariner would recognize.</p>

          <table>
            <thead>
              <tr><th>Feature</th><th>What it captures</th><th>Why it matters</th></tr>
            </thead>
            <tbody>
              <tr><td><code>course_delta</code></td><td>Deviation from expected route</td><td>Strongest behavioral signal of diversion.</td></tr>
              <tr><td><code>ais_age</code></td><td>Seconds since last valid ping</td><td>Dark vessel = invisible by choice or failure.</td></tr>
              <tr><td><code>speed</code></td><td>Out-of-profile speed outliers</td><td>Loitering or sprinting against type is suspicious.</td></tr>
              <tr><td><code>hot_zone_distance</code></td><td>Distance to known incident zones</td><td>Proximity concentrates attention where history says to.</td></tr>
              <tr><td><code>restricted_presence</code></td><td>Inside a restricted polygon</td><td>Hard, legible rule independent of statistics.</td></tr>
              <tr><td><code>attack_proximity</code></td><td>Near past attack locations</td><td>Patterns repeat; weighted accordingly.</td></tr>
            </tbody>
          </table>

          <p>
            Final composite formula:
          </p>
          <pre><code>FinalScore = (RuleScore × 0.4) + (MLScore × 0.4) + (GeoScore × 0.2)</code></pre>

          <h3>Severity Tiers</h3>
          <ul>
            <li><strong>Critical (75-100)</strong> — Multi-factor violation. Immediate interception protocols.</li>
            <li><strong>High (55-74)</strong> — Clear anomaly detected. Duty officer alerted.</li>
            <li><strong>Medium (30-54)</strong> — Unusual behavior. Watchlist recommended.</li>
            <li><strong>Low (0-29)</strong> — Routine traffic. Baseline recording.</li>
          </ul>
        </Prose>

        <ProseHorizontalBarChart
          title="SHAP Feature Importance (mean |SHAP|)"
          data={ML_CHARTS.featureImportance.map(f => ({
            label: f.name,
            value: Math.round(f.importance * 100),
            color: 'var(--color-primary-600)',
          }))}
        />
      </Section>

      {/* ── ML ──────────────────────────────────────────────────────── */}
      <Section id="ml" title="Machine Learning" subtitle="Artifacts, training, and the two endpoints">
        <Prose>
          <p>
            The ML service is a self-contained FastAPI application running Python 3.11 and
            Scikit-learn. It exposes two endpoints:
          </p>

          <table>
            <thead>
              <tr><th>Endpoint</th><th>Models</th><th>Returns</th></tr>
            </thead>
            <tbody>
              <tr><td><code>/api/predict</code> (legacy)</td><td>Isolation Forest + SHAP</td><td>Probability + feature attributions</td></tr>
              <tr><td><code>/api/predict</code> (ensemble)</td><td>IF + LOF + isotonic, multi-domain</td><td>Calibrated probability per domain</td></tr>
            </tbody>
          </table>

          <p>
            Training is offline and reproducible. A Go server goroutine triggers hourly batches,
            extracting current features for all active tracks. The Isolation Forest and LOF models
            are unsupervised — they learn "normal" from full telemetry history — while the isotonic
            calibrator is fit on labeled historical incidents.
          </p>

          <div className="prose-callout info">
            <strong>Model Versioning:</strong> Artifacts are versioned and swapped without backend
            redeploy. The Go service calls whichever <code>/api/predict</code> is configured.
          </div>
        </Prose>
      </Section>

      {/* ── Deployment ─────────────────────────────────────────────── */}
      <Section id="deployment" title="Deployment" subtitle="Three services, one compose file">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Docker Compose</CardTitle>
              <CardDescription>Three services with health checks.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p><code>compose.yaml</code> defines three services: Go backend (port 10020), Python ML (port 8090), and Caddy reverse proxy (port 443). One command: <code>docker compose up -d</code>.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Makefile</CardTitle>
              <CardDescription>Common workflows wrapped.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p><code>make up</code> starts the stack; <code>make test</code> runs suites; <code>make train</code> triggers ML; <code>make backup</code> exports datasets.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CI/CD Pipeline</CardTitle>
              <CardDescription>Automated testing and deployment.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>GitHub Actions builds images, runs Go + Vitest suites, lints documentation. Terraform provisions hosts; Ansible configures and deploys.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>Minimal required variables.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>Supabase connection, AISStream key, OpenSky credentials, OpenRouter key. All documented in <code>.env.example</code>.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── Performance & Ops ──────────────────────────────────────── */}
      <Section id="performance" title="Performance & Operations" subtitle="Runtime characteristics">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>WebSocket Hub</CardTitle><CardDescription>Concurrent client management.</CardDescription></CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>Supports hundreds of concurrent clients with sub-second delivery. 256-msg send buffer per client. Ping/pong keepalive at 54s intervals. New clients receive hydration payload for instant sync.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Rate Limiting</CardTitle><CardDescription>Fair-use protection.</CardDescription></CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>Token-bucket: 20 req/s, burst 40. WebSocket limited by max concurrent connections per IP. 429 response with Retry-After header.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Caching</CardTitle><CardDescription>In-memory GET response caching.</CardDescription></CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>Heavy-read endpoints (heatmap tiles, historical attacks, zones) wrapped with configurable TTLs of 30-300s. Cache keys from full request URI.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Data Retention</CardTitle><CardDescription>Automated lifecycle.</CardDescription></CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>Telemetry &gt;72h purged. Backup snapshots before each purge. Archives retained 30 days, uploadable to Supabase Storage.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <Section id="faq" title="FAQ" subtitle="The questions we hear most">
        <Prose>
          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              Do you store vessel identities?
              <svg className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><title>Expand</title><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              We retain identity fields that AIS broadcasts publicly (MMSI, callsign, type) only as long as needed for tracking and scoring. No crew or ownership data is enriched or profiled.
            </p>
          </details>
          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              How is anomaly severity decided?
              <svg className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><title>Expand</title><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              Composite score (course deviation, signal age, speed, hot-zone distance, restricted presence, attack proximity) is bucketed into tiers. The ML ensemble returns a calibrated probability that refines the tier and supplies the quoted confidence.
            </p>
          </details>
          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              Is the data real-time?
              <svg className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><title>Expand</title><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              Telemetry streams continuously over WebSocket. The documentation updates on a slower editorial cadence — we rewrite when the situation materially changes, not on every ping.
            </p>
          </details>
          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              Why are the maps 2D only?
              <svg className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><title>Expand</title><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              A 2D map is an honest map of a sea lane. We avoid 3D "command-center" styling because it implies precision and surveillance posture the publication does not claim.
            </p>
          </details>
          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              Can I run HormuzWatch myself?
              <svg className="w-4 h-4 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><title>Expand</title><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              Yes. Three services run from Docker Compose. The Makefile wraps common commands. See the Deploy page for step-by-step instructions.
            </p>
          </details>
        </Prose>
      </Section>
    </>
  );
}
