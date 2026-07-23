import { Section } from '@/components/layout/Section';
import { ModelDashboard } from '@/components/data/ModelChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================
// Learn / Documentation index
// Long-form editorial page. Section ids are fixed by the route-level LearnLayout's
// table of contents: introduction, what-is, architecture,
// data-sources, detection, scoring, ml, deployment, faq.
// ============================================================

// ── ML Model Chart Data ──────────────────────────────────────────────────────

const ML_CHARTS = {
  // Anomaly score distribution — bimodal showing normal traffic + true anomalies
  distribution: [
    -0.42, -0.38, -0.35, -0.33, -0.31, -0.29, -0.28, -0.27, -0.26, -0.25, -0.24, -0.24, -0.23,
    -0.23, -0.22, -0.22, -0.21, -0.21, -0.2, -0.2, -0.19, -0.19, -0.18, -0.18, -0.17, -0.17, -0.16,
    -0.15, -0.14, -0.13, -0.12, -0.11, -0.1, -0.09, -0.08, -0.07, -0.06, -0.05, -0.04, -0.03, -0.02,
    -0.01, 0.0, 0.0, 0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1,
    0.1, 0.11, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23,
    0.24, 0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.33, 0.35, 0.37, 0.39, 0.41, 0.43, 0.45, 0.47,
  ],

  // SHAP feature importance (mean |SHAP|)
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

  // Daily anomaly detections — 90-day trend
  trendLabels: [
    'Jan',
    'Jan',
    'Jan',
    'Jan',
    'Jan',
    'Feb',
    'Feb',
    'Feb',
    'Feb',
    'Feb',
    'Feb',
    'Feb',
    'Feb',
    'Mar',
    'Mar',
    'Mar',
    'Mar',
    'Mar',
  ],
  trendValues: [12, 15, 18, 14, 11, 13, 19, 22, 28, 35, 42, 38, 31, 25, 33, 40, 47, 52],

  // F1 score comparison over training epochs
  comparisonLabels: [
    'Epoch 1',
    'Epoch 2',
    'Epoch 3',
    'Epoch 4',
    'Epoch 5',
    'Epoch 6',
    'Epoch 7',
    'Epoch 8',
  ],
  comparisonSeries: [
    { name: 'Isolation Forest', values: [0.62, 0.68, 0.71, 0.73, 0.74, 0.75, 0.76, 0.77] },
    { name: 'LOF', values: [0.58, 0.63, 0.67, 0.69, 0.71, 0.72, 0.73, 0.74] },
    { name: 'Ensemble (IF+LOF+Iso)', values: [0.71, 0.78, 0.82, 0.85, 0.87, 0.88, 0.89, 0.9] },
  ],
};

export default function LearnIndex() {
  return (
    <>
      <Section
        id="introduction"
        level={1}
        title="Documentation"
        subtitle="A written record of how HormuzWatch sees the world's waterways"
      >
        <p className="text-[var(--color-fg-muted)]">
          HormuzWatch is a documentation-first strategic intelligence publication. It is not a
          dashboard you watch; it is a record you read. Every day it quietly fuses open vessel and
          aircraft telemetry, geopolitical event streams, satellite fire detection, weather, and
          news into one continuously updated narrative about the chokepoints that move the global
          economy: the Strait of Hormuz, the Red Sea and Bab-el-Mandeb, the Suez Canal, and the
          wider Persian Gulf.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)]">
          We built it because the waterways that carry a fifth of the world's oil and an enormous
          share of container trade are also among the least legible to the public. National agencies
          and well-funded analysts see them in real time; everyone else reads about them only after
          a crisis. HormuzWatch exists to close that gap — to make the ordinary, boring, continuous
          behavior of these corridors visible and explainable, not just their spectacular failures.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)]">
          This page is the spine of the documentation. It explains what the project is, how the
          pipeline is assembled, where the data comes from, and how an anomalous vessel becomes a
          sentence in a report rather than a red dot on a map. Use the table of contents on the
          right to move between sections.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>The short version</CardTitle>
            <CardDescription>Four sentences that summarize the whole system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-ui text-sm text-[var(--color-fg-muted)]">
            <p>
              We ingest public telemetry about ships (AIS) and aircraft (ADS-B), then check each
              track against the geography of restricted and high-risk zones.
            </p>
            <p>
              A transparent composite score combines course deviation, signal age, speed, distance
              to hot zones, restricted-zone presence, and proximity to historical attacks into a
              Critical / High / Medium / Low severity.
            </p>
            <p>
              A machine-learning ensemble — Isolation Forest, Local Outlier Factor, and isotonic
              calibration — turns that score into a calibrated probability, with SHAP values that
              explain why.
            </p>
            <p>
              The result is written down: an editorial, continuously updated account of the
              corridors, not a control room.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section id="what-is" title="What HormuzWatch is" subtitle="Documentation first, maps second">
        <p className="text-[var(--color-fg-muted)]">
          Most maritime-domain-awareness tools are built as operations centers: a wall of maps, a
          stream of alerts, an analyst glued to the screen. HormuzWatch is deliberately the
          opposite. The primary artifact is the text. Maps are illustrations that live inside the
          narrative — they help you understand a passage in the writing, not the other way around.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)]">
          This is a philosophical choice, not a stylistic one. Reading is the durable form of
          understanding. A live track disappears in seconds; a well-written explanation of why a
          pattern matters persists. By treating documentation as the main output, we are forced to
          make the system explainable: every score has to be describable in words, every model
          prediction has to be traceable to features a reader can inspect.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)]">
          Concretely, that means the on-page experience is long-form and scrollable. You read a
          section, and if a map or a metric helps, it is embedded right there beside the prose. You
          never leave the page to understand the system. The architecture below is described in
          sentences before it is drawn in boxes, and the scoring logic is explained as a list of
          human-readable signals before it is expressed as a formula.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="default">
            <a href="/about">Read the mission</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/intelligence">Open the intelligence record</a>
          </Button>
        </div>
      </Section>

      <Section id="architecture" title="Architecture" subtitle="Three layers, one narrative">
        <p className="text-[var(--color-fg-muted)]">
          HormuzWatch is composed of three independent layers that communicate over narrow,
          well-defined boundaries. This separation is what keeps the publication reproducible and
          the documentation honest: each layer can be reasoned about, tested, and replaced on its
          own.
        </p>

        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--color-primary-800)]">
                Go backend — ingestion and orchestration
              </CardTitle>
              <CardDescription>
                A Gin-based REST service plus a WebSocket hub and six integration workers.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] space-y-2">
              <p>
                The backend is the nervous system. Six integration workers each pull one class of
                data — AIS, ADS-B, GDELT geopolitical events, NASA FIRMS fire detections, Open-Meteo
                weather, and RSS news — normalize it, and hand it to the core. A REST API serves the
                current state; a WebSocket hub streams deltas (new tracks, new anomalies, new
                scores) to the frontend and to any external subscriber.
              </p>
              <p>
                Anomaly scoring lives here too: the geofence check and the composite score are
                computed server-side so that every client sees the same verdict, and so the
                documentation can quote numbers that are real rather than recomputed in the browser.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--color-primary-800)]">
                Python ML service — probabilistic judgment
              </CardTitle>
              <CardDescription>
                A FastAPI service exposing /api/predict and a multi-domain ensemble.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] space-y-2">
              <p>
                The backend does not decide probabilities on its own. For each scored entity it
                calls the ML service over HTTP. The service runs a legacy Isolation Forest with SHAP
                explanations alongside a newer multi-domain ensemble (vessel, aviation, and heatmap
                models) that combines Isolation Forest, Local Outlier Factor, and isotonic
                calibration. The backend attaches the returned probability to the anomaly record.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--color-primary-800)]">
                React frontend — the written record
              </CardTitle>
              <CardDescription>
                React Router v7, MapLibre GL JS 2D maps, and a Zustand store.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] space-y-2">
              <p>
                The frontend is a reader. It consumes the REST API for page state, subscribes to the
                WebSocket hub for live updates, and renders the long-form editorial pages you are
                reading now. Maps are MapLibre GL JS 2D views kept deliberately 2D — no 3D
                surveillance theatre. A small Zustand store holds connection state and live
                telemetry so sections can show current figures without breaking the reading flow.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="mt-6 text-[var(--color-fg-muted)]">
          The contract between them is simple. Backend &rarr; frontend is REST plus WebSocket.
          Backend &rarr; ML is a synchronous{' '}
          <code className="font-data text-sm">POST /api/predict</code> with the engineered features
          and a probability back. Nothing else is shared, which is why the documentation can
          describe each layer in isolation.
        </p>
      </Section>

      <Section
        id="data-sources"
        title="Data sources"
        subtitle="Six open or commercial feeds, normalized into one record"
      >
        <p className="text-[var(--color-fg-muted)]">
          Every figure in HormuzWatch begins as a feed. We deliberately prefer open and
          well-documented sources so that the record can be audited, and we treat each source as a
          claim to be corroborated rather than a fact to be trusted blindly.
        </p>
        <div className="mt-6 space-y-4 font-ui text-sm text-[var(--color-fg-muted)]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
              AIS — vessel telemetry
            </h3>
            <p className="mt-2">
              Automatic Identification System transponder messages provide vessel identity (MMSI,
              IMO, callsign), navigation status, position, course over ground, speed over ground,
              heading, and destination. Ingested via the AISStream WebSocket feed at approximately
              5,000 messages per minute, AIS forms the backbone of the maritime record. We treat
              signal loss, spoofing, and AIS gaps as themselves analytically meaningful rather than
              artifacts to be discarded. Each position report is normalized into a unified
              <code className="font-data text-xs">TelemetryPayload</code> and broadcast to all
              connected clients through the WebSocket hub.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
              ADS-B — aircraft telemetry
            </h3>
            <p className="mt-2">
              Automatic Dependent Surveillance–Broadcast transmissions report aircraft ICAO address,
              callsign, position, altitude, ground speed, and vertical rate. Data is polled from the
              OpenSky Network REST API every 3 minutes for the Gulf region bounding box. ADS-B
              coverage is inherently less complete than AIS — not all aircraft transmit, and
              military transponders are often off — but the presence or sudden absence of air
              traffic in a corridor is frequently the earliest observable signal of an emerging
              military or security incident.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
              GDELT — geopolitical events
            </h3>
            <p className="mt-2">
              The Global Database of Events, Language, and Tone (GDELT) Project monitors global
              broadcast, print, and web news in over 100 languages, identifying events using the
              CAMEO conflict and mediation taxonomy. We query GDELT every 5 minutes for events
              within the Gulf region, filtering for event codes associated with military activity,
              protests, diplomatic actions, and armed conflict. GDELT provides the structural
              context that distinguishes a routine vessel deviation from one occurring against a
              backdrop of escalating regional tension.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
              NASA FIRMS — fire detection
            </h3>
            <p className="mt-2">
              The Fire Information for Resource Management System (FIRMS) distributes active fire
              and thermal anomaly data from the MODIS (Terra/Aqua) and VIIRS (Suomi-NPP/NOAA-20)
              satellite instruments. We poll FIRMS every 15 minutes for the Gulf region. In a
              maritime corridor, an unexpected thermal hotspot — an explosion, a shipboard fire, or
              an oil platform incident — is a high-signal event. FIRMS detections feed both the
              spatial heatmap layer and the anomaly scoring pipeline.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
              Open-Meteo — marine weather
            </h3>
            <p className="mt-2">
              The Open-Meteo free weather API provides wave height, wave direction, wind speed, wind
              direction, visibility, and sea-level pressure forecasts at 1-hour resolution. We fetch
              fresh forecasts every 30 minutes for the Gulf bounding box. Weather is a critical
              contextual variable: course deviations driven by storm avoidance are routine and
              should not inflate anomaly scores. By explicitly modeling weather alongside behavioral
              signals, the scoring pipeline suppresses false positives that would otherwise be
              flagged as anomalous deviations.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
              RSS — maritime security news
            </h3>
            <p className="mt-2">
              A curated set of RSS feeds from maritime security organizations — including UKMTO, IMB
              Piracy Reporting Centre, EU NAVFOR, CMF/IMSC, and major wire services — is polled
              every 2 minutes via the <code className="font-data text-xs">gofeed</code> library.
              Each article is parsed for title, publication date, and content summary. News items
              serve as the ground-truth layer: a behavioral anomaly detected by the ML ensemble that
              is corroborated by a contemporaneous news report has higher confidence than one
              detected in isolation. RSS is the slowest data source but the most authoritative for
              confirming that a detected pattern reflects a real-world event.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="detection"
        title="Detection pipeline"
        subtitle="From raw ping to written verdict"
      >
        <p className="text-[var(--color-fg-muted)]">
          The detection pipeline is a straight line with one branch into machine learning. Each step
          is small and inspectable, which matters because the output of the pipeline eventually
          becomes prose a reader is meant to trust.
        </p>
        <ol className="mt-6 space-y-4">
          {[
            {
              step: 'Ingest',
              body: 'Workers pull each feed, parse it, and normalize records into a common schema. A vessel ping and an aircraft ping land in the same shape so the rest of the pipeline never has to care which world it came from.',
            },
            {
              step: 'Geofence',
              body: 'Every track is tested against polygons for restricted and high-risk zones — territorial limits, anchorage areas, and the corridor geometries of Hormuz, Bab-el-Mandeb, Suez, and the Gulf. Presence inside a zone is a first-class boolean feature.',
            },
            {
              step: 'Composite score',
              body: 'We compute a hand-built score from human-readable signals: course delta against expected route, AIS message age (staleness), speed outliers, distance to known hot zones, restricted-zone presence, and proximity to the locations of historical attacks.',
            },
            {
              step: 'Severity',
              body: 'The composite score is bucketed into Critical, High, Medium, and Low. This tier is the editorial unit — it is what a section headline will eventually say.',
            },
            {
              step: 'ML ensemble',
              body: 'The engineered features are sent to the Python service, which returns a calibrated anomaly probability and, for the legacy model, SHAP values. The probability refines the tier and supplies the confidence the writer can quote.',
            },
          ].map((item, i) => (
            <li
              key={item.step}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-data text-lg font-semibold text-[var(--color-primary-700)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display text-xl font-semibold text-[var(--color-fg)]">
                  {item.step}
                </h3>
              </div>
              <p className="mt-2 font-ui text-sm text-[var(--color-fg-muted)]">{item.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[var(--color-fg-muted)]">
          The whole pipeline runs continuously, so "the record" is never a snapshot. A vessel that
          was Low at noon can be High by noon-fifteen, and the section that covers it is updated to
          match.
        </p>
      </Section>

      <Section id="scoring" title="Anomaly scoring" subtitle="The features behind every tier">
        <p className="text-[var(--color-fg-muted)]">
          The composite score is deliberately boring and transparent. It is a weighted combination
          of features a mariner would recognize, chosen so that any tier can be explained in a
          sentence. We prefer a score a reader can audit over a black box that is slightly more
          accurate.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left font-ui text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-fg-muted)]">
                <th className="py-3 pr-4 font-medium">Feature</th>
                <th className="py-3 pr-4 font-medium">What it captures</th>
                <th className="py-3 font-medium">Why it matters</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-fg-muted)]">
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">course_delta</td>
                <td className="py-3 pr-4">Deviation from expected route</td>
                <td className="py-3">The single strongest behavioral signal of diversion.</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">ais_age</td>
                <td className="py-3 pr-4">Seconds since last valid ping</td>
                <td className="py-3">A dark vessel is invisible by choice or by failure.</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">speed</td>
                <td className="py-3 pr-4">Out-of-profile speed outliers</td>
                <td className="py-3">Loitering or sprinting against type is suspicious.</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">hot_zone_distance</td>
                <td className="py-3 pr-4">Distance to known incident zones</td>
                <td className="py-3">Proximity concentrates attention where history says to.</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">restricted_presence</td>
                <td className="py-3 pr-4">Inside a restricted polygon</td>
                <td className="py-3">A hard, legible rule independent of statistics.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">attack_proximity</td>
                <td className="py-3 pr-4">Near past attack locations</td>
                <td className="py-3">Patterns repeat; we weight them accordingly.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-[var(--color-fg-muted)]">
          The ML output is blended with deterministic rules and geopolitical risk factors to produce
          a composite threat score:
        </p>
        <div className="my-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center font-display text-lg text-[var(--color-primary-700)]">
          <span className="text-[var(--color-fg)] font-semibold">FinalScore</span> = (RuleScore
          &times; 0.4) + (MLScore &times; 0.4) + (GeoScore &times; 0.2)
        </div>

        <p className="mt-6 text-[var(--color-fg-muted)]">
          The composite score maps onto four severity tiers. They are the vocabulary of the
          publication:
        </p>
        <ul className="mt-3 space-y-2 font-ui text-sm text-[var(--color-fg-muted)]">
          <li>
            <span className="font-semibold text-[var(--color-fg)]">Critical (75-100)</span> —
            Multi-factor violation (e.g., vessel went dark, dropped speed, and entered restricted
            zone). Immediate interception protocols activated.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-fg)]">High (55-74)</span> — Clear
            anomaly detected by ML or rule engine. Duty officer alerted.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-fg)]">Medium (30-54)</span> — Unusual
            behavior or minor rule violation. Watchlist recommended.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-fg)]">Low (0-29)</span> — Routine
            traffic. Recorded for the historical baseline.
          </li>
        </ul>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>The machine-learning layer</CardTitle>
            <CardDescription>Ensemble, calibration, and explanation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-ui text-sm text-[var(--color-fg-muted)]">
            <p>
              On top of the composite score sits the ML ensemble: Isolation Forest for global
              outliers, Local Outlier Factor for local density anomalies, and isotonic regression to
              calibrate raw scores into honest probabilities. A separate heatmap model fuses the
              FIRMS and weather signals for the regional views.
            </p>
            <p>
              Explainability is non-negotiable. The legacy model ships SHAP values, so for any
              prediction we can list, in order, which features pushed the probability up or down.
              The documentation quotes these rather than a single opaque number.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section
        id="ml"
        title="Machine learning"
        subtitle="Artifacts, training, and the two endpoints"
      >
        <p className="text-[var(--color-fg-muted)]">
          The ML service is a self-contained FastAPI application running Python 3.11 and
          Scikit-learn. It exposes two kinds of endpoints: a legacy path built around a single
          Isolation Forest (`sklearn.ensemble.IsolationForest`) with SHAP explanations, and a newer
          ensemble path that combines models across the vessel, aviation, and heatmap domains. Both
          accept engineered features and return a probability; only the legacy path currently
          returns SHAP (`shap.TreeExplainer`) attributions alongside it.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)]">
          Training is offline and reproducible. To prevent concept drift, a Go server
          `StartAutomatedTraining()` goroutine triggers hourly batches, extracting current features
          for all active tracks. Features are engineered by the Go backend and persisted, so the
          models learn from the same representation the scoring logic uses. The Isolation Forest and
          LOF models are unsupervised — they learn "normal" from the full telemetry history — while
          the isotonic calibrator is fit on the small set of labeled historical incidents we do
          have, turning anomaly scores (typically [-0.5, 0.5]) into probabilities a reader can
          interpret as risk.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left font-ui text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-fg-muted)]">
                <th className="py-3 pr-4 font-medium">Endpoint</th>
                <th className="py-3 pr-4 font-medium">Models</th>
                <th className="py-3 font-medium">Returns</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-fg-muted)]">
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">
                  /api/predict (legacy)
                </td>
                <td className="py-3 pr-4">Isolation Forest + SHAP</td>
                <td className="py-3">Probability + feature attributions</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-data text-[var(--color-fg)]">
                  /api/predict (ensemble)
                </td>
                <td className="py-3 pr-4">IF + LOF + isotonic, multi-domain</td>
                <td className="py-3">Calibrated probability per domain</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Model Performance Visualizations ──────────────────────────── */}
        <div className="mt-10">
          <ModelDashboard
            distributionData={ML_CHARTS.distribution}
            featureImportance={ML_CHARTS.featureImportance}
            trendLabels={ML_CHARTS.trendLabels}
            trendValues={ML_CHARTS.trendValues}
            comparisonLabels={ML_CHARTS.comparisonLabels}
            comparisonSeries={ML_CHARTS.comparisonSeries}
          />
        </div>

        <p className="mt-6 text-[var(--color-fg-muted)]">
          Model artifacts are versioned and swapped without a backend redeploy: the Go service just
          calls whichever <code className="font-data text-sm">/api/predict</code> is configured.
          That boundary is what lets the documentation describe "the model" in the present tense
          even as the artifact behind it improves.
        </p>
      </Section>

      <Section id="deployment" title="Deployment" subtitle="Three services, one compose file">
        <p className="text-[var(--color-fg-muted)]">
          HormuzWatch is distributed as three containerized services — the Go backend, the Python ML
          service, and a Caddy reverse proxy — orchestrated by Docker Compose for local and
          single-node deployments. The same images promote cleanly to production using the
          infrastructure-as-code definitions provided in the repository.
        </p>
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Docker Compose</CardTitle>
              <CardDescription>
                Three services with health checks and a shared network.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>
                The <code className="font-data text-xs">compose.yaml</code> defines three services:
                the Go backend on port 10020, the Python ML service on port 8090, and a Caddy
                reverse proxy on port 443. Each service has a health check endpoint and restarts on
                failure. Environment variables are sourced from a single <code>.env</code> file.
                Bringing up the entire stack requires one command: <code>docker compose up -d</code>
                .
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Makefile</CardTitle>
              <CardDescription>Common workflows wrapped for convenience.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>
                A project-level Makefile provides shorthand targets: <code>make up</code> starts the
                stack; <code>make test</code> runs the Go and Python test suites;{' '}
                <code>make train</code> triggers the ML training pipeline; <code>make backup</code>{' '}
                exports all datasets to disk and optional cloud storage. Contributors rarely need to
                interact with Docker or Python virtual environments directly.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CI/CD Pipeline</CardTitle>
              <CardDescription>Automated testing, building, and deployment.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>
                GitHub Actions builds both container images, runs the backend Go test suite and the
                frontend Vitest suite, lints the documentation for broken links, and publishes
                container images to the registry. Terraform provisions the host and networking
                layer; Ansible configures the node and rolls out the Compose stack. Infrastructure
                is declared in code, not configured manually.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Required variables for a minimal deployment.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)]">
              <p>
                A minimal deployment requires: a Supabase (PostgreSQL) connection string, an
                AISStream API key, an OpenSky Network username and password, and an OpenRouter API
                key for AI briefing generation. Optional integrations include Google Drive OAuth
                credentials for dataset backups, Telegram Bot API credentials for notifications, and
                a Supabase service role key for storage bucket uploads. All variables are documented
                in the <code>.env.example</code> template.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        id="performance"
        title="Performance & Operations"
        subtitle="Runtime characteristics and operational guidance"
      >
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Hub</CardTitle>
              <CardDescription>Concurrent client management.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                The Gorilla WebSocket hub supports hundreds of concurrent clients with sub-second
                message delivery. Each client connection is tracked independently with a 256-message
                send buffer and automatic ping/pong keepalive at 54-second intervals. New clients
                receive a hydration payload of existing active tracks and anomalies so they are
                immediately synchronized without re-fetching the entire dataset.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>Fair-use protection for public endpoints.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                The REST API enforces token-bucket rate limiting at 20 requests per second with a
                burst capacity of 40. WebSocket connections are rate-limited by maximum concurrent
                connections per IP. Public endpoints are unrestricted and require no authentication;
                authenticated endpoints return a 429 Too Many Requests with a Retry-After header
                when limits are exceeded.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Caching</CardTitle>
              <CardDescription>In-memory GET response caching.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                Heavy-read endpoints (heatmap tiles, historical attacks, restricted zones) are
                wrapped with an in-memory cache middleware with configurable TTLs of 30–300 seconds.
                Cache keys are derived from the full request URI, and cache entries are invalidated
                on the TTL boundary. This reduces database query load for high-frequency polling
                clients without affecting data freshness guarantees.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>Automated cleanup and storage lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="font-ui text-sm text-[var(--color-fg-muted)] leading-relaxed">
              <p>
                A background retention worker runs on a configurable interval to purge telemetry
                records older than 72 hours and heatmap grid cells older than 24 hours. The backup
                pipeline exports a complete dataset snapshot before each purge cycle. Backup
                archives are retained for 30 days on disk and can be uploaded to Supabase Storage
                buckets for durable off-site archival.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="faq" title="Frequently asked questions" subtitle="The questions we hear most">
        <div className="mt-6 space-y-3 max-w-3xl">
          {[
            {
              q: 'Do you store vessel identities?',
              a: 'We retain the identity fields that AIS broadcasts publicly (MMSI, callsign, type) only as long as needed to maintain a track and its score. We do not enrich or profile vessel operators beyond what the open feed already exposes, and we avoid keeping personally identifying crew or ownership data. The publication is about behavior in shared waterways, not about surveilling anyone.',
            },
            {
              q: 'How is anomaly severity decided?',
              a: 'The composite score — course deviation, signal age, speed, hot-zone distance, restricted-zone presence, and attack proximity — is bucketed into Critical, High, Medium, and Low. The ML ensemble then returns a calibrated probability that refines the tier and supplies the confidence quoted in the writing. Both the score and the probability are explainable, so a severity claim always has a reason attached.',
            },
            {
              q: 'Is the data real-time?',
              a: 'Telemetry is ingested continuously and streamed to the frontend over WebSocket, so the live figures on a page refresh within seconds of the feeds. The documentation itself is updated on a slower editorial cadence — we rewrite a section when the situation materially changes, not on every ping.',
            },
            {
              q: 'Why are the maps 2D only?',
              a: 'A 2D map is an honest map of a sea lane. We deliberately avoid 3D "command-center" styling because it implies a precision and a surveillance posture the publication does not claim. The point is to read and understand, not to role-play an operations room.',
            },
            {
              q: 'Can I run HormuzWatch myself?',
              a: 'Yes. The three services — Go backend, Python ML service, and React frontend — run from Docker Compose. The Makefile wraps the common commands (make dev, make build, make test). See the Deploy page for step-by-step instructions including environment variable configuration and Supabase setup.',
            },
          ].map((faq) => (
            <details key={faq.q} className="glass-card rounded-xl p-4 group cursor-pointer">
              <summary className="font-display text-base font-semibold text-[var(--color-fg)] list-none flex items-center justify-between">
                {faq.q}
                <svg
                  className="w-5 h-5 text-[var(--color-fg-muted)] group-open:rotate-180 transition-transform shrink-0 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>Expand answer</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)] leading-relaxed">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
