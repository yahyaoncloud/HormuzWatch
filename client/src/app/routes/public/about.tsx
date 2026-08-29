import { Link } from 'react-router';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Prose } from '@/components/ui/prose';

const principles = [
  { title: 'Transparency', body: 'Every methodology is documented and open for inspection. Scoring formulas are published, models are versioned, data sources are named, and every severity judgment includes the rationale that produced it.' },
  { title: 'Documentation-First', body: 'The written record is the primary output. Maps, charts, and metrics serve the narrative — they illustrate conclusions, not replace them.' },
  { title: 'Methodological Honesty', body: 'We report confidence intervals alongside predictions. We do not imply precision where the underlying data or models do not support it.' },
  { title: 'Behavioral Monitoring', body: 'We analyze patterns in shared waterways using publicly broadcast telemetry, deliberately avoiding tracking individuals or enriching profiles with proprietary data.' },
  { title: 'Open Infrastructure', body: 'The entire stack — ingestion, scoring, API, frontend, and documentation — is open source. No feature is gated behind a paid tier.' },
  { title: 'Reproducibility', body: 'Every published result can be reproduced. Models ship with training data snapshots, evaluation metrics, and hyperparameter configurations.' },
];

const milestones = [
  { period: 'Q1 2024', title: 'Conceptual Design', desc: 'Identified the gap between real-time maritime awareness tools and accessible public documentation. Defined three-service architecture: Go ingestion, Python ML, document-first React frontend.' },
  { period: 'Q3 2024', title: 'Initial Pipeline', desc: 'Go backend with Gin + WebSocket hub. Integrated AIS (AISStream), ADS-B (OpenSky), GDELT. Deployed Isolation Forest for anomaly detection. PostgreSQL persistence.' },
  { period: 'Q1 2025', title: 'ML Ensemble', desc: 'Added LOF, isotonic calibration, SHAP attribution. Extended coverage across vessel, aviation, and heatmap domains. Automated hourly training cycle.' },
  { period: 'Q3 2025', title: 'Conflict Intelligence', desc: 'Launched conflict pipeline aggregating OSINT from 22+ sources. Integrated LLM-based situational briefing. Added XGBoost + RandomForest ensemble for escalation forecasting.' },
  { period: 'Q1 2026', title: 'Documentation-First Redesign', desc: 'Rearchitected frontend around long-form editorial pages. Added Learn section, interactive model charts, extended watch zones to Red Sea and Bab-el-Mandeb.' },
  { period: 'Q3 2026', title: 'Production Hardening', desc: 'Automated dataset backup, model versioning + registry, real-time conflict markers, segmented timeline filters, collapsible zone overlays.' },
];

export default function AboutPage() {
  return (
    <PageContainer>
      {/* ── Mission ──────────────────────────────────────────────── */}
      <Section id="mission" title="Mission" subtitle="Maritime domain awareness as public infrastructure">
        <Prose>
          <p>
            HormuzWatch exists to make the world's most critical waterways legible to the people and
            institutions who depend on them. The Strait of Hormuz, the Red Sea and Bab-el-Mandeb
            corridor, the Suez Canal approaches, and the Persian Gulf collectively carry a
            disproportionate share of global energy trade and container traffic.
          </p>
          <p>
            We believe this opacity represents a structural information gap. When a crisis occurs — a
            tanker seizure, a subsea cable disruption, a corridor rerouting — the global public learns
            of it through headlines, stripped of the weeks of behavioral signals that would have
            contextualized the event. HormuzWatch addresses this by publishing a continuously updated,
            methodologically transparent record of what is happening at sea.
          </p>
          <blockquote>
            Our objective is not to replace operational command centers. It is to serve as a public
            reference: a calm, well-documented account that anyone — from logistics analysts and
            academic researchers to journalists and policy staff — can consult.
          </blockquote>
        </Prose>

        <div className="prose-callout info mt-6">
          <strong>Watch Zone Coverage:</strong> Real-time analytics powered by in-memory track
          state manager and WebSocket pipeline. Visit the Intelligence dashboard for live vessel
          counts by region.
        </div>
      </Section>

      {/* ── The Problem ──────────────────────────────────────────── */}
      <Section id="problem" title="The Information Gap" subtitle="Why the waterways are difficult to observe">
        <Prose>
          <p>
            Critical maritime corridors present a paradox: they are simultaneously the most
            consequential and the least transparent segments of the global supply chain.
          </p>
          <h3>Three structural factors</h3>
          <ol>
            <li><strong>Telemetry Fragmentation</strong> — Vessel positions (AIS), aircraft tracks (ADS-B), geopolitical events (GDELT), satellite fire detection (NASA FIRMS), weather (Open-Meteo), and news (RSS) exist across incompatible systems with no shared schema.</li>
            <li><strong>Institutional Incentives</strong> — Government agencies and commercial providers maintain sophisticated monitoring but distribute through classified channels or expensive subscriptions.</li>
            <li><strong>Signal-to-Noise Complexity</strong> — Tens of thousands of daily AIS transmissions. Isolating anomalous signals without false positives requires calibrated scoring across behavioral context, geography, and corroborating sources.</li>
          </ol>

          <div className="prose-callout info">
            <strong>Scope Boundaries:</strong> HormuzWatch is <em>not</em> a real-time alerting service, operational command platform, or source of classified information. It is a reference publication — prioritize accuracy over sub-second latency.
          </div>
        </Prose>
      </Section>

      {/* ── Methodology ───────────────────────────────────────────── */}
      <Section id="approach" title="Methodology" subtitle="Open telemetry, transparent scoring, narrative output">
        <Prose>
          <p>Three integrated layers form the HormuzWatch pipeline. Each is independently testable, documented, and replaceable.</p>
          <h3>1. Ingestion & Normalization</h3>
          <p>Six dedicated workers pull from public telemetry sources continuously: AIS vessel positions, ADS-B aircraft, GDELT events, NASA FIRMS fires, Open-Meteo weather, and RSS maritime security news. Each stream is normalized into a unified JSON schema and broadcast via WebSocket.</p>
          <h3>2. Scoring & Detection</h3>
          <p>Every track is evaluated against a multi-layered framework: geofence proximity checks, a six-signal composite score (course deviation, AIS age, speed anomaly, hot-zone distance, restricted presence, attack proximity), and an ML ensemble (Isolation Forest + LOF + isotonic calibration) returning calibrated probabilities with SHAP attributions.</p>
          <h3>3. Narrative & Publication</h3>
          <p>The React frontend prioritizes reading over monitoring. Maps and charts are embedded inline with prose. Every severity judgment includes the reasoning chain, and every chart links to underlying data.</p>
        </Prose>

        <div className="prose-callout info mt-6">
          <strong>ML Performance:</strong> Model evaluation metrics are published in real-time.
          Refer to the API documentation and Research section for current benchmark data.
        </div>
      </Section>

      {/* ── Principles ────────────────────────────────────────────── */}
      <Section id="principles" title="Operating Principles" subtitle="The standards that govern every published result">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {principles.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle className="text-[var(--color-primary-600)]">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
                <p>{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── Project History ───────────────────────────────────────── */}
      <Section id="timeline" title="Project History" subtitle="Development milestones from conception to production">
        <Prose>
          <p>
            HormuzWatch is an independently developed open-source project. The timeline below
            documents major architectural milestones and feature deliveries.
          </p>
        </Prose>
        <div className="mt-6 space-y-4">
          {milestones.map((m) => (
            <div key={m.title} className="flex flex-col gap-2 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="font-data text-sm font-semibold text-[var(--color-primary-600)] sm:w-20 sm:shrink-0">
                {m.period}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-[var(--color-fg)]">{m.title}</h3>
                <p className="mt-1 font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Data Pipeline Overview ─────────────────────────────────── */}
      <Section id="data" title="Data Pipeline" subtitle="Six sources, one unified record">
        <Prose>
          <p>
            Every figure in HormuzWatch begins as a public feed. We deliberately prefer open and
            well-documented sources so the record can be audited.
          </p>

          <div className="prose-metric-row">
            <div className="prose-metric">
              <div className="prose-metric-value">~5,000</div>
              <div className="prose-metric-label">AIS msgs/min</div>
            </div>
            <div className="prose-metric">
              <div className="prose-metric-value">~800</div>
              <div className="prose-metric-label">ADS-B tracks/hr</div>
            </div>
            <div className="prose-metric">
              <div className="prose-metric-value">1,200+</div>
              <div className="prose-metric-label">GDELT events/day</div>
            </div>
            <div className="prose-metric">
              <div className="prose-metric-value">22+</div>
              <div className="prose-metric-label">RSS news sources</div>
            </div>
          </div>

          <h3>Data retention</h3>
          <p>
            Telemetry records older than 72 hours are purged on a configurable interval. Backup
            archives are retained for 30 days and can be uploaded to Supabase Storage for off-site
            archival. A background retention worker exports a complete dataset snapshot before each
            purge cycle.
          </p>

          <div className="prose-callout warn">
            <strong>Disclaimer:</strong> HormuzWatch provides intelligence for situational awareness only.
            No liability is accepted for decisions made based on this data. Always consult official
            maritime authorities for operational guidance.
          </div>
        </Prose>
      </Section>

      {/* ── Contributing ───────────────────────────────────────────── */}
      <Section id="contribute" title="Contributing" subtitle="How to participate in the project">
        <Prose>
          <p>
            HormuzWatch welcomes contributions across multiple disciplines. The project spans
            backend engineering, machine learning, geospatial analysis, frontend development, and
            technical writing.
          </p>
          <ul>
            <li><strong>Code Contributions</strong> — Go backend, Python ML service, React frontend. Each has contribution guides and test suites.</li>
            <li><strong>Data & Analysis</strong> — Validated datasets, labeled anomaly examples, verified conflict records directly improve model accuracy.</li>
            <li><strong>Documentation</strong> — Clear, accurate documentation is as important as correct code. Explanatory diagrams, API reference improvements, translations.</li>
            <li><strong>Deployment</strong> — Docker Compose, Makefile, CI/CD improvements. Support for additional cloud providers.</li>
          </ul>
        </Prose>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="default">
            <Link to="/learn">Start with the documentation</Link>
          </Button>
          <Button asChild variant="link">
            <a href="mailto:hello@hormuzwatch.com">hello@hormuzwatch.com</a>
          </Button>
        </div>
      </Section>
    </PageContainer>
  );
}
