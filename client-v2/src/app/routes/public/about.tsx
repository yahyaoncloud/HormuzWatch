import { Link } from 'react-router';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================
// About — mission, principles, methodology, and project history.
// ============================================================

const principles = [
  {
    title: 'Transparency',
    body: 'Every methodology is documented and open for inspection. Scoring formulas are published, models are versioned, data sources are named, and every severity judgment includes the rationale that produced it. If a result cannot be explained, it is not published.',
  },
  {
    title: 'Documentation-First',
    body: 'The written record is the primary output of the system. Maps, charts, and metrics serve the narrative — they illustrate conclusions, not replace them. We optimize for durable understanding that persists beyond a single screen session.',
  },
  {
    title: 'Methodological Honesty',
    body: 'We report confidence intervals alongside predictions. When a model returns a probability of 0.87, we note the calibration accuracy and the features that contributed. We do not imply precision where the underlying data or models do not support it.',
  },
  {
    title: 'Behavioral Monitoring, Not Individual Surveillance',
    body: 'HormuzWatch analyzes patterns in shared waterways using publicly broadcast telemetry. We retain only the identity fields that AIS and ADS-B openly transmit, do not enrich profiles with proprietary data, and deliberately avoid tracking individuals.',
  },
  {
    title: 'Open Infrastructure',
    body: 'The entire stack — ingestion, scoring, API, frontend, and documentation — is open source. Deploying your own instance requires only Docker, a Supabase account, and access to the same public telemetry feeds we consume. No feature is gated behind a paid tier.',
  },
  {
    title: 'Reproducibility',
    body: 'Every published result can be reproduced. Models are shipped with their training data snapshots, evaluation metrics, and hyperparameter configurations. The documentation includes step-by-step instructions for retraining from scratch using the provided datasets.',
  },
];

const milestones = [
  {
    period: 'Q1 2024',
    title: 'Conceptual Design',
    desc: 'Research phase: identified the gap between real-time maritime domain awareness tools and accessible public documentation. Defined the project architecture around three independent services — Go ingestion, Python ML, and a document-first React frontend — communicating over REST, gRPC, and WebSocket.',
  },
  {
    period: 'Q3 2024',
    title: 'Initial Pipeline',
    desc: 'Implemented the Go backend with Gin HTTP framework, Gorilla WebSocket hub, and PostgreSQL persistence. Integrated the first three data sources: AIS vessel positions via AISStream, ADS-B aircraft positions via OpenSky, and GDELT geopolitical event monitoring. Deployed a single Isolation Forest model for anomaly detection.',
  },
  {
    period: 'Q1 2025',
    title: 'Machine Learning Ensemble',
    desc: 'Expanded the ML pipeline to include Local Outlier Factor, isotonic probability calibration, and SHAP-based feature attribution. Extended coverage across three operational domains: maritime vessels, aviation tracks, and spatial heatmap aggregation. Established the automated training cycle: hourly batch extraction from the Go backend, training in the Python service, and model deployment via gRPC.',
  },
  {
    period: 'Q3 2025',
    title: 'Conflict Intelligence Module',
    desc: 'Launched the conflict intelligence pipeline, aggregating OSINT from 22+ sources across the Gulf region. Integrated OpenRouter API for LLM-based situational briefing generation. Added the conflict prediction ensemble (XGBoost + RandomForest) for severity classification and escalation forecasting.',
  },
  {
    period: 'Q1 2026',
    title: 'Documentation-First Redesign',
    desc: 'Rearchitected the frontend around long-form editorial pages. Introduced the Learn section with architecture diagrams, detection methodology, anomaly taxonomy, and API reference. Added interactive ML model visualization charts with the Model Dashboard. Expanded watch zones to include Red Sea, Bab-el-Mandeb, and northern Persian Gulf.',
  },
  {
    period: 'Q3 2026',
    title: 'Production Hardening',
    desc: 'Implemented automated dataset backup pipeline with Supabase Storage and Telegram notification support. Added robust ML training orchestration with model versioning, registry, and auto-promotion. Introduced real-time conflict markers on the Leaflet map with severity-coded popups, segmented timeline filters, and collapsible zone overlays.',
  },
];

export default function AboutPage() {
  return (
    <PageContainer>
      {/* ── Mission ──────────────────────────────────────────────────── */}
      <Section
        id="mission"
        title="Mission"
        subtitle="Maritime domain awareness as public infrastructure"
      >
        <p className="text-[var(--color-fg-muted)] leading-relaxed">
          HormuzWatch exists to make the world's most critical waterways legible to the people and
          institutions who depend on them. The Strait of Hormuz, the Red Sea and Bab-el-Mandeb
          corridor, the Suez Canal approaches, and the Persian Gulf collectively carry a
          disproportionate share of global energy trade and container traffic — yet the ordinary,
          continuous behavior of these corridors remains invisible to all but a small number of
          government agencies and commercial intelligence providers.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)] leading-relaxed">
          We believe this opacity represents a structural information gap. When a crisis occurs — a
          tanker seizure, a subsea cable disruption, a corridor rerouting — the global public learns
          of it through headlines, stripped of the preceding weeks of behavioral signals that would
          have contextualized the event. HormuzWatch addresses this by publishing a continuously
          updated, methodologically transparent record of what is happening at sea, fusing
          open-source telemetry, machine learning, and narrative journalism into a single accessible
          account.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)] leading-relaxed">
          Our objective is not to replace operational command centers or commercial analytics
          platforms. It is to serve as a public reference: a calm, well-documented account that
          anyone — from logistics analysts and academic researchers to journalists and policy staff
          — can consult to understand baseline maritime behavior and its deviations.
        </p>
      </Section>

      {/* ── The Problem ──────────────────────────────────────────────── */}
      <Section
        id="problem"
        title="The Information Gap"
        subtitle="Why the waterways are difficult to observe"
      >
        <p className="text-[var(--color-fg-muted)] leading-relaxed">
          Critical maritime corridors present a paradox: they are simultaneously the most
          consequential and the least transparent segments of the global supply chain. Several
          structural factors contribute to this opacity.
        </p>

        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Telemetry Fragmentation</CardTitle>
              <CardDescription>
                Data exists across incompatible systems and formats.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Vessel positions are broadcast via AIS and collected by multiple commercial
                aggregators (Spire, MarineTraffic, Orbcomm). Aircraft positions flow through ADS-B
                networks (OpenSky, FlightRadar24, ADSB Exchange). Geopolitical events are tracked by
                the GDELT Project. Thermal anomalies are detected by NASA FIRMS satellites. Weather
                and sea state come from Open-Meteo. News is distributed across hundreds of RSS feeds
                and wire services. None of these systems are designed to interoperate, and
                normalizing them into a coherent picture requires significant engineering
                investment.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Institutional Incentives</CardTitle>
              <CardDescription>
                Those who see clearly have little reason to publish.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Government agencies and commercial intelligence providers maintain sophisticated
                real-time monitoring capabilities. Their outputs, however, are typically classified,
                proprietary, or distributed through expensive subscription tiers. The resulting
                asymmetry means that detailed maritime situational awareness is concentrated within
                a small number of institutions, while the global community that depends on these
                waterways operates with incomplete information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signal-to-Noise Complexity</CardTitle>
              <CardDescription>
                Distinguishing anomalous behavior from normal variation is non-trivial.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Tens of thousands of vessels transmit AIS data daily. The overwhelming majority of
                position reports represent routine commercial transit. Isolating the small fraction
                that indicates elevated risk — without generating excessive false positives from
                weather avoidance, navigational adjustments, or equipment variability — requires a
                calibrated scoring methodology that accounts for behavioral context, geographic
                constraints, and corroborating signals from multiple independent sources.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Scope Boundaries</CardTitle>
            <CardDescription>What HormuzWatch does not attempt to do.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
            <p>
              <strong>Not a real-time alerting service.</strong> The publication updates on an
              editorial cadence informed by data freshness, not a pager. We prioritize accuracy and
              explainability over sub-second latency.
            </p>
            <p>
              <strong>Not an operational command platform.</strong> HormuzWatch does not provide
              navigation guidance, collision avoidance, or tactical decision support. It is a
              reference publication, not a control system.
            </p>
            <p>
              <strong>Not a source of classified or restricted information.</strong> Every data
              point published is derived from publicly accessible sources. We do not access, store,
              or disseminate information with security classifications or proprietary restrictions.
            </p>
          </CardContent>
        </Card>
      </Section>

      {/* ── Methodology ───────────────────────────────────────────────── */}
      <Section
        id="approach"
        title="Methodology"
        subtitle="Open telemetry, transparent scoring, narrative output"
      >
        <p className="text-[var(--color-fg-muted)] leading-relaxed">
          Three integrated layers form the HormuzWatch pipeline. Each is independently testable,
          documented, and replaceable.
        </p>

        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--color-primary-800)]">
                1. Ingestion & Normalization
              </CardTitle>
              <CardDescription>
                Go backend with six integration workers and a WebSocket hub.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Six dedicated workers continuously pull from public telemetry sources: AIS vessel
                positions (AISStream WebSocket), ADS-B aircraft positions (OpenSky Network API),
                GDELT geopolitical event stream, NASA FIRMS active fire detections, Open-Meteo
                marine weather forecasts, and RSS-based maritime security news aggregators. Each
                data stream is normalized into a unified JSON schema, timestamped, and persisted to
                PostgreSQL. A WebSocket hub broadcasts deltas to all connected clients and to the
                internal anomaly scoring pipeline in real time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--color-primary-800)]">
                2. Scoring & Detection
              </CardTitle>
              <CardDescription>Geofence rules, composite scoring, and ML ensemble.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Every track is evaluated against a multi-layered scoring framework. The geofence
                layer checks proximity to restricted zones, historical conflict sites, and
                environmental exclusion areas. The composite score combines six human-readable
                signals: course deviation, AIS signal age, speed anomaly, hot-zone proximity,
                restricted-zone presence, and historical attack adjacency. A Python ML service
                (FastAPI with gRPC) refines these scores using an ensemble of Isolation Forest,
                Local Outlier Factor, and isotonic probability calibration, returning calibrated
                confidence values and SHAP feature attributions for every prediction.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--color-primary-800)]">
                3. Narrative & Publication
              </CardTitle>
              <CardDescription>
                Documentation-first frontend with embedded analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                The React frontend prioritizes reading over monitoring. Long-form editorial pages
                explain architecture, methodology, and regional analysis. Interactive Leaflet maps
                show vessel and aircraft tracks, conflict markers, and heatmap layers embedded
                inline with the prose. Model performance charts are rendered via uPlot with
                expandable fullscreen views. Every severity judgment includes the reasoning chain
                and contributing features, and every chart links to the underlying data and
                methodology documentation.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="default">
            <Link to="/learn">Read the full documentation</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/intelligence">Open the intelligence record</Link>
          </Button>
        </div>
      </Section>

      {/* ── Principles ────────────────────────────────────────────────── */}
      <Section
        id="principles"
        title="Operating Principles"
        subtitle="The standards that govern every published result"
      >
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {principles.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle className="text-[var(--color-primary-800)]">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
                <p>{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── Project History ───────────────────────────────────────────── */}
      <Section
        id="timeline"
        title="Project History"
        subtitle="Development milestones from conception to production"
      >
        <p className="text-[var(--color-fg-muted)] leading-relaxed">
          HormuzWatch is an independently developed open-source project. The timeline below
          documents major architectural milestones and feature deliveries from initial research
          through the current production deployment.
        </p>
        <div className="mt-6 space-y-4">
          {milestones.map((m) => (
            <div
              key={m.title}
              className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <span className="font-data text-sm font-semibold text-[var(--color-primary-700)] sm:w-20 sm:shrink-0">
                {m.period}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
                  {m.title}
                </h3>
                <p className="mt-1 font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
                  {m.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Contributing ───────────────────────────────────────────────── */}
      <Section id="contribute" title="Contributing" subtitle="How to participate in the project">
        <p className="text-[var(--color-fg-muted)] leading-relaxed">
          HormuzWatch welcomes contributions across multiple disciplines. Because the project spans
          backend engineering, machine learning, geospatial analysis, frontend development, and
          technical writing, there are many ways to contribute meaningfully.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Code Contributions</CardTitle>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                The entire stack is open source. The Go backend, Python ML service, and React
                frontend each have their own contribution guides and test suites. Areas of active
                development include: additional data source integrations, improved model
                architectures, performance optimization for the WebSocket hub, and accessibility
                improvements for the frontend.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Analysis</CardTitle>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Contributions of validated datasets — particularly historical track data, labeled
                anomaly examples, and verified conflict event records — directly improve model
                accuracy. Researchers with domain expertise in maritime security, naval operations,
                or Middle Eastern geopolitics are invited to review and suggest refinements to the
                scoring methodology and regional analysis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Clear, accurate documentation is as important to the project as correct code.
                Contributions that clarify confusing passages, add explanatory diagrams, improve the
                API reference, or translate documentation into additional languages are highly
                valued.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deployment & Infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                The project provides Docker Compose definitions, a Makefile, and environment
                configuration templates. Contributions that improve deployment reliability, add
                support for additional cloud providers, or strengthen the CI/CD pipeline are
                welcome.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="default">
            <Link to="/learn">Start with the documentation</Link>
          </Button>
          <Button asChild variant="link">
            <a href="mailto:hello@hormuzwatch.com">Contact: hello@hormuzwatch.com</a>
          </Button>
        </div>
      </Section>
    </PageContainer>
  );
}
