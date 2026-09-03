import { Link } from 'react-router';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Prose, ProseHorizontalBarChart } from '@/components/ui/prose';
import { Info, BarChart3, Globe, Cpu, Activity } from 'lucide-react';

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
    { label: 'Course Delta (Δ° mod 360)', value: 32 },
    { label: 'AIS Gap Duration (min)', value: 26 },
    { label: 'Restricted Zone Proximity (km)', value: 21 },
    { label: 'Speed Delta (knots)', value: 17 },
    { label: 'Speed Variance (Welford)', value: 15 },
    { label: 'Heading Delta (Δ° mod 360)', value: 13 },
    { label: 'Historical Incident Proximity', value: 11 },
    { label: 'EWMA Course Deviation', value: 9 },
    { label: 'Rolling Average Speed (knots)', value: 7 },
  ],
};

export interface LearnIndexProps {
  onOpenAbout?: () => void;
  onOpenIntelligence?: () => void;
  onOpenMap?: () => void;
}

export default function LearnIndex({ onOpenAbout, onOpenIntelligence, onOpenMap }: LearnIndexProps) {
  return (
    <>
      {/* ── Introduction ──────────────────────────────────────────── */}
      <Section id="introduction" level={1} title="Platform Documentation" subtitle="Mathematical foundations, pipeline architecture, and empirical calibration">
        <Prose>
          <p>
            HormuzWatch is a documentation-first geospatial intelligence publication and operational awareness system.
            Rather than overwhelming operators with unverified alarms, it fuses open vessel (AIS) and aircraft (ADS-B) telemetry,
            geopolitical event feeds (GDELT), NASA satellite thermal observations, and meteorological streams into an audited,
            calibrated intelligence record.
          </p>
          <p>
            Operating in the Strait of Hormuz demands rigorous statistical discipline. Tankers frequently maneuver to adhere
            to Traffic Separation Schemes (TSS) or evade maritime congestion. Naive machine learning models flag these standard
            procedures as anomalous, creating severe alert fatigue. HormuzWatch solves this through <strong>MMSI-grouped entity partitioning</strong>,
            a dual <strong>Isolation Forest + Local Outlier Factor ensemble</strong>, and <strong>non-parametric Isotonic Regression</strong> calibration.
          </p>

          <blockquote>
            This documentation outlines the mathematical derivations, telemetry ingestion mechanics,
            model governance protocols, and multi-factor intelligence fusion powering the live platform.
          </blockquote>
        </Prose>

        {/* Action Buttons Routing to Tabs */}
        <div className="mt-6 flex flex-wrap gap-3">
          {onOpenAbout ? (
            <Button onClick={onOpenAbout} variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm">
              <Info className="w-4 h-4 mr-2" />
              Read Mission & About Tab
            </Button>
          ) : (
            <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">
              <Link to="/?tab=about">
                <Info className="w-4 h-4 mr-2" />
                Read Mission & About Tab
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
              Live Tactical Map
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-slate-700 hover:border-indigo-400">
              <Link to="/?tab=map">
                <Globe className="w-4 h-4 mr-2 text-indigo-400" />
                Live Tactical Map
              </Link>
            </Button>
          )}
        </div>
      </Section>

      {/* ── Architecture ───────────────────────────────────────────── */}
      <Section id="architecture" title="System Architecture" subtitle="Three decoupled microservices with gRPC and WebSocket IPC">
        <Prose>
          <p>
            The HormuzWatch ecosystem is engineered as three decoupled services communicating over strict interfaces:
          </p>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="border border-indigo-500/20 bg-[var(--color-bg-card)]">
            <CardHeader>
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Cpu className="w-4 h-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Engine 01</span>
              </div>
              <CardTitle className="text-base text-[var(--color-fg)]">Go Telemetry Core</CardTitle>
              <CardDescription>Port 10020 · In-Memory TSM</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Concurrent ingestors pulling AISStream, OpenSky ADS-B, GDELT, and FIRMS. Maintains online circular statistics
                and rolling Welford moments. Dispatches gRPC scoring requests and broadcasts live deltas to clients via WebSockets.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-indigo-500/20 bg-[var(--color-bg-card)]">
            <CardHeader>
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Engine 02</span>
              </div>
              <CardTitle className="text-base text-[var(--color-fg)]">Python ML Microservice</CardTitle>
              <CardDescription>Ports 8090/8091 · gRPC & REST</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Dual Isolation Forest (200 estimators) + Local Outlier Factor (k=20). Features non-parametric Isotonic Regression
                calibration, TreeSHAP explainability, and automated continuous retraining governance.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-indigo-500/20 bg-[var(--color-bg-card)]">
            <CardHeader>
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Globe className="w-4 h-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Engine 03</span>
              </div>
              <CardTitle className="text-base text-[var(--color-fg)]">React 19 Tactical Client</CardTitle>
              <CardDescription>Port 3000 · Tab-Based Routing</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Hardware-accelerated MapLibre/Leaflet geospatial visualization, tabbed operational pages (Map, Intelligence,
                Feed, Docs, About), light-indigo dark HUD theme, and instant tab synchronization via URL query state.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── Feature Engineering ───────────────────────────────────── */}
      <Section id="features" title="Feature Engineering & Circular Manifolds" subtitle="9 canonical kinematic features on the S¹ manifold">
        <Prose>
          <p>
            Standard Euclidean metrics fail when applied to navigational courses: a vessel altering course from $359^\circ$ to $1^\circ$ has turned $2^\circ$,
            yet a naive linear difference calculates $|1 - 359| = 358^\circ$. HormuzWatch projects angular attributes onto the 1-sphere manifold ($S^1$):
          </p>
          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300">
            {`Δθ = ((θ_current - θ_previous + 180°) mod 360°) - 180°`}
          </pre>
          <p>
            Running speeds and variances are computed in constant $O(1)$ time and $O(1)$ memory using Welford's algorithm,
            preventing catastrophic numerical cancellation during long transits.
          </p>
        </Prose>

        {/* Feature Importance Bar Chart */}
        <div className="mt-6">
          <h3 className="font-display text-sm font-semibold text-[var(--color-fg)] mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Ensemble Feature Attribution (Mean |SHAP| Weight)
          </h3>
          <ProseHorizontalBarChart data={ML_CHARTS.featureImportance} />
        </div>
      </Section>

      {/* ── Calibration & Benchmark ────────────────────────────────── */}
      <Section id="calibration" title="Probability Calibration & Verification" subtitle="Non-parametric Isotonic Regression benchmarked on unseen MMSI entities">
        <Prose>
          <p>
            Raw decision functions from anomaly detection algorithms are non-linear and uncalibrated: an Isolation Forest score of -0.15
            does not mean a 15% anomaly probability. In mission-critical maritime domain awareness, operators require calibrated posterior probabilities:
          </p>
          <code className="block my-2 p-2 bg-slate-900/80 border border-slate-800 rounded font-mono text-xs text-indigo-300">
            P(Y = 1 | s_hat) ≈ s_hat
          </code>
          <p>
            HormuzWatch implements <strong>non-parametric Isotonic Regression</strong>, fitting a monotonic step function:
          </p>
          <code className="block my-2 p-2 bg-slate-900/80 border border-slate-800 rounded font-mono text-xs text-indigo-300">
            min_m Σ (y_i - m(s_i))²  subject to m(s_i) ≤ m(s_j) for s_i ≤ s_j
          </code>
          <p>
            This was empirically validated in our technical whitepaper benchmarks against Platt scaling, achieving:
          </p>
          <ul>
            <li><strong>Expected Calibration Error (ECE) Reduction</strong>: <strong>69.2% decrease</strong> (from 14.86% down to <strong>4.57%</strong>).</li>
            <li><strong>Brier Score Verification</strong>: Reduced from 0.1603 to <strong>0.0912</strong>.</li>
            <li><strong>Zero Data Leakage Invariant</strong>: Validated using <code>GroupKFold</code> strictly partitioned by MMSI. No ship present in training appears in testing.</li>
          </ul>

          <div className="prose-callout info">
            <strong>Calibrated Probability vs. Hostile Threat:</strong> A vessel displaying a 92% anomaly probability is simply exhibiting statistically abnormal kinematics (e.g., drifting with engine issues or executing a tight collision-avoidance turn). Hostile categorization requires corroboration via the Go backend's tri-partite fusion engine (40% Heuristics + 40% ML + 20% Geopolitical Risk).
          </div>
        </Prose>
      </Section>

      {/* ── Governance & Continuous Training ───────────────────────── */}
      <Section id="governance" title="MLOps Continuous Training (CT) Governance" subtitle="Automated drift detection, smoke tests, and atomic POSIX deployment">
        <Prose>
          <p>
            Models operate in dynamic contested littoral zones. Telemetry streams undergo automated continuous monitoring:
          </p>
          <ol>
            <li><strong>Drift Surveillance</strong>: Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) tests run continuously over 24-hour observation windows.</li>
            <li><strong>Champion Degradation Guard</strong>: If a retrained candidate fails to exceed champion benchmark accuracy or degrades ECE below Grade A (&le;0.05), training automatically rejects the candidate and retains the active champion.</li>
            <li><strong>Zero-Downtime Hot Reload</strong>: Promoted candidate weights are written to temporary staging files, verified with pre-flight smoke tests, and promoted via atomic POSIX <code>os.replace</code>. The gRPC inference server detects file touch events and reloads models in under 5 milliseconds without dropping active requests.</li>
          </ol>
        </Prose>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <Section id="faq" title="Frequently Asked Questions" subtitle="Engineering implementation details">
        <Prose>
          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 rounded-lg cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              How does tab routing work without page reloads?
              <svg className="w-4 h-4 text-indigo-400 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              All major views (Map, Intelligence, Feed, Docs, About) are unified inside the main single-page application tab manager. The URL reflects the active tab via <code>?tab=&lt;name&gt;</code>, allowing full browser history traversal, bookmarking, and instant tab transitions without unmounting live WebSockets or tearing down MapLibre contexts.
            </p>
          </details>

          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 rounded-lg cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              How is data leakage prevented during continuous retraining?
              <svg className="w-4 h-4 text-indigo-400 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              In maritime telemetry, a single ship emits hundreds of consecutive pings. A random row split leaks the identical ship into both train and test partitions. HormuzWatch enforces strict Grouped K-Fold splitting by MMSI, ensuring test folds evaluate exclusively on unseen vessels.
            </p>
          </details>

          <details className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 mb-2 rounded-lg cursor-pointer">
            <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
              Why was Isotonic Regression chosen over Platt scaling?
              <svg className="w-4 h-4 text-indigo-400 transition-transform shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <p className="text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
              Platt scaling assumes an underlying sigmoid (logistic) probability distribution. Maritime telemetry outliers exhibit complex multimodal distributions that violate parametric sigmoid curves. Isotonic regression fits a flexible, non-parametric isotonic step function, reducing calibration error by over 69%.
            </p>
          </details>
        </Prose>
      </Section>

      {/* ── Footer Navigation Strip ─────────────────────────────────── */}
      <div className="mt-12 p-6 rounded-2xl border border-indigo-500/25 bg-[#0b111e]/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-display text-base font-semibold text-white">Continue Exploring HormuzWatch</h4>
          <p className="font-ui text-xs text-slate-400 mt-0.5">Switch between operational tabs without disrupting background telemetry streams.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onOpenAbout ? (
            <Button onClick={onOpenAbout} variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer text-xs">
              <Info className="w-3.5 h-3.5 mr-1.5" />
              About & Mission Tab
            </Button>
          ) : (
            <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
              <Link to="/?tab=about">
                <Info className="w-3.5 h-3.5 mr-1.5" />
                About & Mission Tab
              </Link>
            </Button>
          )}

          {onOpenIntelligence ? (
            <Button onClick={onOpenIntelligence} variant="outline" className="border-slate-700 hover:border-indigo-400 text-xs cursor-pointer">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Intelligence Tab
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-slate-700 hover:border-indigo-400 text-xs">
              <Link to="/?tab=intelligence">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Intelligence Tab
              </Link>
            </Button>
          )}

          {onOpenMap ? (
            <Button onClick={onOpenMap} variant="outline" className="border-slate-700 hover:border-indigo-400 text-xs cursor-pointer">
              <Globe className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Tactical Map
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-slate-700 hover:border-indigo-400 text-xs">
              <Link to="/?tab=map">
                <Globe className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Tactical Map
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
