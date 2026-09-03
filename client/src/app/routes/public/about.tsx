import { Link } from 'react-router';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Prose } from '@/components/ui/prose';
import { BookOpen, BarChart3, Globe } from 'lucide-react';

const principles = [
  {
    title: 'Methodological Transparency',
    body: 'Every methodology is documented and open for inspection. Anomaly scoring formulas are published, models are versioned, data sources are named, and every severity judgment provides explainable feature attributions.'
  },
  {
    title: 'Zero Data Leakage Invariant',
    body: 'Tracking models are strictly evaluated on unseen entities via Maritime Mobile Service Identity (MMSI) grouped partitioning, guaranteeing that reported benchmark numbers reflect authentic out-of-distribution performance.'
  },
  {
    title: 'Calibrated Probabilities over Raw Scores',
    body: 'We reject arbitrary heuristic scoring. Raw decision scores are passed through non-parametric Isotonic Regression to output empirical, mathematically sound anomaly probabilities (ECE 0.0457).'
  },
  {
    title: 'Calibrated Anomaly ≠ Hostile Intent',
    body: 'A kinematic outlier indicates a physical telemetry anomaly, not necessarily hostile intent. Real-world maneuvers (COLREGs collision avoidance, engine trouble) are synthesized through a multi-factor intelligence engine.'
  },
  {
    title: 'Open Public Infrastructure',
    body: 'The entire stack — Go ingestion, Python ML service, React 19 tactical UI, and technical whitepaper documentation — is open source and reproducible.'
  },
  {
    title: 'Continuous Governance & Rollback',
    body: 'Every candidate model is subjected to automated smoke testing, key validation, and champion degradation guards before atomic POSIX file promotion, backed by automated rollback.'
  },
];

const milestones = [
  {
    period: 'Q1 2024',
    title: 'Conceptual Design',
    desc: 'Identified the gap between real-time maritime awareness tools and accessible public documentation. Defined three-service architecture: Go ingestion, Python ML, document-first React frontend.'
  },
  {
    period: 'Q3 2024',
    title: 'Initial Telemetry Pipeline',
    desc: 'Go backend with Gin + WebSocket hub. Integrated AIS (AISStream), ADS-B (OpenSky), GDELT. Deployed Isolation Forest for anomaly detection. PostgreSQL persistence.'
  },
  {
    period: 'Q1 2025',
    title: 'Dual Ensemble & Calibration',
    desc: 'Added LOF, isotonic calibration, SHAP attribution. Extended coverage across vessel, aviation, and heatmap domains. Automated hourly training cycle.'
  },
  {
    period: 'Q3 2025',
    title: 'Conflict Intelligence Fusion',
    desc: 'Launched conflict pipeline aggregating OSINT from 22+ sources. Integrated LLM-based situational briefing. Added composite threat scoring (40% Rule + 40% ML + 20% Geo).'
  },
  {
    period: 'Q1 2026',
    title: 'Documentation-First Redesign',
    desc: 'Rearchitected frontend around long-form editorial pages and interactive tactical HUD. Added Learn section, interactive model charts, extended watch zones to Red Sea and Bab-el-Mandeb.'
  },
  {
    period: 'Q3 2026',
    title: 'MLOps Continuous Training & Technical Whitepaper',
    desc: 'Authored 22-page technical whitepaper. Benchmarked dual Isolation Forest + LOF ensemble, achieving 69.2% reduction in Expected Calibration Error (0.0457 ECE). Implemented authoritative grouped MMSI partitioning (zero data leakage), POSIX atomic promotion, and sub-5ms inference.'
  },
];

export interface AboutPageProps {
  onOpenDocs?: () => void;
  onOpenIntelligence?: () => void;
  onOpenMap?: () => void;
}

export default function AboutPage({ onOpenDocs, onOpenIntelligence, onOpenMap }: AboutPageProps) {
  return (
    <PageContainer>
      {/* ── Mission ──────────────────────────────────────────────── */}
      <Section id="mission" title="Mission" subtitle="Maritime domain awareness as public infrastructure">
        <Prose>
          <p>
            HormuzWatch exists to make the world's most critical waterways legible to the people and
            institutions who depend on them. The Strait of Hormuz, the Red Sea and Bab-el-Mandeb
            corridor, the Suez Canal approaches, and the Persian Gulf collectively carry over 20%
            of global energy trade and container traffic.
          </p>
          <p>
            Operating within these contested maritime corridors presents acute challenges: electronic warfare,
            GPS spoofing, automated identification system (AIS) transponder blackouts, and asymmetric tactical threats.
            HormuzWatch provides a calm, methodologically transparent, and continuously updated record of what is happening at sea.
          </p>
          <blockquote>
            Our objective is not to replace operational naval command centers. It is to serve as an authoritative public
            reference: a calm, well-documented account that analysts, logistics coordinators, academic researchers,
            and journalists can consult with confidence.
          </blockquote>
        </Prose>

        <div className="prose-callout info mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <strong>Watch Zone Coverage:</strong> Real-time analytics powered by an in-memory Time-Series State
            Manager (TSM) and high-concurrency WebSocket broadcasting.
          </div>
          {onOpenIntelligence ? (
            <Button size="sm" variant="outline" onClick={onOpenIntelligence} className="cursor-pointer shrink-0">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              View Intelligence Tab
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/?tab=intelligence">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                View Intelligence Tab
              </Link>
            </Button>
          )}
        </div>
      </Section>

      {/* ── The Problem ──────────────────────────────────────────── */}
      <Section id="problem" title="The Information Gap" subtitle="Why contested littoral waterways are difficult to observe">
        <Prose>
          <p>
            Critical maritime corridors present a paradox: they are simultaneously the most
            consequential and the least transparent segments of the global supply chain.
          </p>
          <h3>Three structural factors</h3>
          <ol>
            <li><strong>Telemetry Fragmentation</strong> — Vessel positions (AIS), aircraft tracks (ADS-B), geopolitical events (GDELT), satellite fire detection (NASA FIRMS), and maritime news exist across incompatible schemas with no unified fusion.</li>
            <li><strong>Institutional Barriers</strong> — Commercial tracking platforms gate vital intelligence behind opaque subscriptions or classified military command feeds.</li>
            <li><strong>Alert Fatigue and Raw ML Failure</strong> — Commercial tankers routinely maneuver for safety or weather. Naive threshold rules generate thousands of false alarms, while uncalibrated raw anomaly scores produce severe overconfidence.</li>
          </ol>

          <div className="prose-callout info">
            <strong>Scope Boundaries:</strong> HormuzWatch prioritizes scientific reproducibility and calibration accuracy. We report calibrated probabilities alongside TreeSHAP feature attributions so every alert can be audited.
          </div>
        </Prose>
      </Section>

      {/* ── Methodology ───────────────────────────────────────────── */}
      <Section id="approach" title="Methodology" subtitle="Open telemetry, calibrated ML ensemble, tri-partite threat fusion">
        <Prose>
          <p>Three integrated layers form the HormuzWatch intelligence pipeline:</p>
          
          <h3>1. High-Concurrency Ingestion & State Engine (Go 1.23)</h3>
          <p>
            Six integration workers pull from public telemetry feeds continuously. Ingested pings are managed in an in-memory Time-Series State Manager (TSM) maintaining online moments via Welford's algorithm. Circular angular statistics on the 1-sphere manifold ($S^1$) eliminate $359^\circ \leftrightarrow 0^\circ$ boundary discontinuities.
          </p>

          <h3>2. Dual Ensemble & Isotonic Calibration (Python 3.11 / gRPC :8091)</h3>
          <p>
            A synergistic ensemble combining <strong>Isolation Forest (200 trees)</strong> for global geometric space partitioning with <strong>Local Outlier Factor (k=20)</strong> for local neighborhood density estimation. Raw scores are blended (0.55 * IF + 0.45 * LOF) and transformed via non-parametric <strong>Isotonic Regression</strong>, reducing Expected Calibration Error (ECE) by <strong>69.2%</strong> (down to 4.57%).
          </p>

          <h3>3. Tri-Partite Threat Intelligence Fusion</h3>
          <p>
            To prevent single points of failure, the Go backend synthesizes risk across three distinct operational pillars:
          </p>
          <code className="block my-2 p-2 bg-slate-900/80 border border-slate-800 rounded font-mono text-xs text-indigo-300">
            FinalScore = round( 0.40 * Score_Rule + 0.40 * Score_ML + 0.20 * Score_Geo )
          </code>
          <p>
            This guarantees that statistical outliers are never confused with hostile rogue intent without geopolitical and regulatory corroboration.
          </p>
        </Prose>

        <div className="prose-callout info mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <strong>Technical Whitepaper & Benchmarks:</strong> Complete mathematical formulations, benchmark datasets, and architecture diagrams are published in our 22-page technical whitepaper.
          </div>
          {onOpenDocs ? (
            <Button size="sm" variant="outline" onClick={onOpenDocs} className="cursor-pointer shrink-0">
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Open Docs Tab
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/?tab=docs">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Open Docs Tab
              </Link>
            </Button>
          )}
        </div>
      </Section>

      {/* ── Principles ────────────────────────────────────────────── */}
      <Section id="principles" title="Operating Principles" subtitle="The standards that govern every published result">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {principles.map((p) => (
            <Card key={p.title} className="border border-indigo-500/20 bg-[var(--color-bg-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-indigo-400 text-base font-semibold">{p.title}</CardTitle>
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
            HormuzWatch is an independently developed open-source geospatial intelligence initiative. The timeline below
            documents major architectural milestones and feature deliveries.
          </p>
        </Prose>
        <div className="mt-6 space-y-4">
          {milestones.map((m) => (
            <div key={m.title} className="flex flex-col gap-2 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:flex-row sm:items-baseline sm:gap-6 rounded-xl">
              <span className="font-mono text-xs font-bold text-indigo-400 sm:w-24 sm:shrink-0">
                {m.period}
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-[var(--color-fg)]">{m.title}</h3>
                <p className="mt-1 font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Data Pipeline Overview ─────────────────────────────────── */}
      <Section id="data" title="Data Pipeline" subtitle="Six public sources, one unified record">
        <Prose>
          <p>
            Every observation in HormuzWatch begins as a public feed. We deliberately prefer open and
            auditable sources so intelligence assessments can be independently verified.
          </p>

          <div className="prose-metric-row">
            <div className="prose-metric">
              <div className="prose-metric-value text-indigo-400">~5,000</div>
              <div className="prose-metric-label">AIS msgs/min</div>
            </div>
            <div className="prose-metric">
              <div className="prose-metric-value text-indigo-400">~800</div>
              <div className="prose-metric-label">ADS-B tracks/hr</div>
            </div>
            <div className="prose-metric">
              <div className="prose-metric-value text-indigo-400">1,200+</div>
              <div className="prose-metric-label">GDELT events/day</div>
            </div>
            <div className="prose-metric">
              <div className="prose-metric-value text-indigo-400">22+</div>
              <div className="prose-metric-label">RSS news sources</div>
            </div>
          </div>

          <h3>Data retention & Continuous Retraining</h3>
          <p>
            Telemetry records are cached in memory for sub-10ms queries. Historical observation windows
            feed the Continuous Training (CT) pipeline with automated Population Stability Index (PSI)
            and Kolmogorov-Smirnov drift monitoring.
          </p>

          <div className="prose-callout warn">
            <strong>Operational Disclaimer:</strong> HormuzWatch provides geospatial intelligence for situational awareness and research. Always consult official International Maritime Organization (IMO) and national coastal authorities for navigation commands.
          </div>
        </Prose>
      </Section>

      {/* ── Contributing & Tab Navigation Buttons ─────────────────── */}
      <Section id="contribute" title="Platform Navigation & Contributions" subtitle="Explore the platform tabs or participate in development">
        <Prose>
          <p>
            HormuzWatch welcomes contributions across engineering disciplines — Go telemetry ingestors,
            Python ML pipelines, React UI development, and technical documentation.
          </p>
        </Prose>

        {/* Action Buttons Routing to Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {onOpenDocs ? (
            <Button onClick={onOpenDocs} variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm">
              <BookOpen className="w-4 h-4 mr-2" />
              Open Documentation Tab
            </Button>
          ) : (
            <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">
              <Link to="/?tab=docs">
                <BookOpen className="w-4 h-4 mr-2" />
                Open Documentation Tab
              </Link>
            </Button>
          )}

          {onOpenIntelligence ? (
            <Button onClick={onOpenIntelligence} variant="outline" className="cursor-pointer border-slate-700 hover:border-indigo-400">
              <BarChart3 className="w-4 h-4 mr-2 text-indigo-400" />
              Open Intelligence Tab
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-slate-700 hover:border-indigo-400">
              <Link to="/?tab=intelligence">
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-400" />
                Open Intelligence Tab
              </Link>
            </Button>
          )}

          {onOpenMap ? (
            <Button onClick={onOpenMap} variant="outline" className="cursor-pointer border-slate-700 hover:border-indigo-400">
              <Globe className="w-4 h-4 mr-2 text-indigo-400" />
              Open Live Tactical Map
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-slate-700 hover:border-indigo-400">
              <Link to="/?tab=map">
                <Globe className="w-4 h-4 mr-2 text-indigo-400" />
                Open Live Tactical Map
              </Link>
            </Button>
          )}

          <Button asChild variant="link" className="text-indigo-400 hover:text-indigo-300">
            <a href="mailto:hello@hormuzwatch.com">Contact Engineering Team</a>
          </Button>
        </div>
      </Section>
    </PageContainer>
  );
}
