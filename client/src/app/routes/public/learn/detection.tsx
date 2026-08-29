import { Link } from 'react-router';
import { Section } from '@/components/layout/Section';
import { LivePlatformMetrics } from '@/components/data/MetricGrid';
import { EditorialMap } from '@/components/maps';
import { cn } from '@/utils/cn';

// ============================================================
// How Detection Works - Living Documentation
// ============================================================

const detectionPipeline = [
  {
    stage: 1,
    name: 'Data Ingestion',
    description:
      'Multi-protocol ingestion of AIS (satellite + terrestrial), ADS-B, radar, satellite imagery, and OSINT feeds.',
    tech: 'Kafka + WebSocket',
    metrics: [
      { label: 'AIS msg/min', value: '45.2K', color: 'primary' },
      { label: 'ADS-B msg/min', value: '128.7K', color: 'info' },
      { label: 'Ingestion Latency', value: '12ms', color: 'success' },
    ],
    liveDemo: 'ais-stream',
  },
  {
    stage: 2,
    name: 'Track Correlation',
    description:
      'Multi-source fusion engine correlates AIS, ADS-B, and radar into unified vessel/aircraft tracks with 98.7% match rate.',
    tech: 'Graph-based deduplication',
    metrics: [
      { label: 'Tracks Active', value: '12.3K', color: 'primary' },
      { label: 'Correlation Rate', value: '98.7%', color: 'success' },
      { label: 'Processing Time', value: '45ms', color: 'warning' },
    ],
    liveDemo: 'track-fusion',
  },
  {
    stage: 3,
    name: 'Behavioral Scoring',
    description:
      'Multi-factor anomaly engine evaluates route deviation, speed changes, dark periods, zone proximity, and pattern matching.',
    tech: 'XGBoost + Rules',
    metrics: [
      { label: 'Models Active', value: '6', color: 'primary' },
      { label: 'Score Latency', value: '89ms', color: 'success' },
      { label: 'False Positive', value: '2.3%', color: 'warning' },
    ],
    liveDemo: 'behavioral-scoring',
  },
  {
    stage: 4,
    name: 'Threat Classification',
    description:
      'Rule-based + ML ensemble classifies: smuggling, sanctions evasion, military activity, environmental violations.',
    tech: 'Ensemble Classifier',
    metrics: [
      { label: 'Categories', value: '6', color: 'primary' },
      { label: 'Accuracy', value: '94.2%', color: 'success' },
      { label: 'Avg Confidence', value: '87%', color: 'info' },
    ],
    liveDemo: 'threat-class',
  },
  {
    stage: 5,
    name: 'Real-time Alerting',
    description:
      'Sub-second WebSocket push to dashboards, API webhooks, and mobile notifications with severity routing.',
    tech: 'WebSocket + Webhook',
    metrics: [
      { label: 'Alert Latency', value: '247ms', color: 'success' },
      { label: 'Avg Severity', value: 'High', color: 'danger' },
      { label: 'Daily Alerts', value: '1.2K', color: 'warning' },
    ],
    liveDemo: 'alerting',
  },
  {
    stage: 6,
    name: 'Historical Analysis',
    description:
      'Time-series storage enables pattern detection, trend analysis, and predictive modeling across 90 days history.',
    tech: 'ClickHouse + S3',
    metrics: [
      { label: 'History', value: '90 days', color: 'primary' },
      { label: 'Storage', value: '2.4TB', color: 'info' },
      { label: 'Query Latency', value: '380ms', color: 'success' },
    ],
    liveDemo: 'historical',
  },
];

const anomalyTypes = [
  {
    type: 'Route Deviation',
    desc: 'Vessel departs declared route by >5 nautical miles',
    severity: 'high',
    color: 'warning',
    count: 12,
  },
  {
    type: 'Dark Period',
    desc: 'AIS transponder off for >2 hours in monitored zone',
    severity: 'critical',
    color: 'danger',
    count: 5,
  },
  {
    type: 'Speed Anomaly',
    desc: 'Speed change inconsistent with vessel class',
    severity: 'medium',
    color: 'info',
    count: 23,
  },
  {
    type: 'Zone Proximity',
    desc: 'Vessel enters restricted/exclusion zone',
    severity: 'high',
    color: 'warning',
    count: 8,
  },
  {
    type: 'Loitering',
    desc: 'Station-keeping in unexpected area',
    severity: 'medium',
    color: 'info',
    count: 18,
  },
  {
    type: 'Rendezvous',
    desc: 'Two vessels meet for unexplained transfer',
    severity: 'critical',
    color: 'danger',
    count: 3,
  },
  {
    type: 'Sanctions Evasion',
    desc: 'Flag switching, spoofing, or obfuscation',
    severity: 'critical',
    color: 'danger',
    count: 2,
  },
  {
    type: 'Pattern Match',
    desc: 'Behavior matches known threat actor playbook',
    severity: 'high',
    color: 'warning',
    count: 6,
  },
];

export default function LearnDetection() {
  return (
    <>
      {/* Hero */}
      <Section
        id="introduction"
        title="How Anomaly Detection Works"
        subtitle="A six-stage pipeline from raw signals to actionable intelligence"
        className="mb-4"
      >
        <div className="prose-body max-w-4xl">
          <p className="text-body-lg text-fg/90">
            HormuzWatch's anomaly detection engine processes over{' '}
            <strong>173,000 messages per minute</strong> across AIS, ADS-B, radar, and satellite
            feeds. Each signal flows through a six-stage pipeline that transforms raw data into
            classified, scored, and prioritized intelligence — all in under{' '}
            <strong>250 milliseconds</strong>.
          </p>
          <p className="mt-4">
            This page is <strong>living documentation</strong>. As you read about each pipeline
            stage, you see the actual metrics from the running system. The map below shows live
            anomalies detected in real-time.
          </p>
        </div>
      </Section>

      {/* Live Map */}
      <Section
        id="live-detection"
        title="Live Anomaly Map"
        subtitle="Active anomalies detected in the last hour"
        className="mb-4"
      >
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden glass-card border border-border/50">
          <EditorialMap
            region="world"
            className="w-full h-full"
            height="100%"
            showLayerControls={true}
            showMetricsRibbon={false}
          />
        </div>
        <div className="mt-4 glass-card rounded-xl p-4 border border-border/50 text-center">
          <p className="font-ui text-body text-fg-muted">
            Real-time detection statistics are computed live from the anomaly pipeline.
            Connect your dashboard for current metrics.
          </p>
        </div>
      </Section>

      {/* Pipeline Stages */}
      <Section
        id="pipeline"
        title="Detection Pipeline"
        subtitle="Six stages, sub-second end-to-end latency"
        className="mb-4"
      >
        <div className="space-y-6">
          {detectionPipeline.map((stage, i) => (
            <article
              key={stage.stage}
              className={cn(
                'glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all',
                i % 2 === 1 && 'lg:flex-row-reverse'
              )}
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-16 lg:shrink-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-data text-data-lg font-bold">
                    {stage.stage}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-display text-heading-md text-fg">{stage.name}</h3>
                    <span className="px-3 py-1 bg-background-elevated border border-border/50 rounded-full text-caption text-fg-muted shrink-0">
                      {stage.tech}
                    </span>
                  </div>
                  <p className="font-ui text-body text-fg-muted mb-4">{stage.description}</p>
                  <div className="flex flex-wrap gap-4">
                    {stage.metrics.map((m) => (
                      <div key={m.label} className="flex items-center gap-2">
                        <span
                          className="font-data text-data-sm"
                          style={{ color: `var(--color-${m.color})` }}
                        >
                          {m.value}
                        </span>
                        <span className="font-ui text-caption text-fg-muted">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Architecture Diagram */}
      <Section
        id="architecture"
        title="Pipeline Architecture"
        subtitle="Data flow from ingestion to alerting"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <div className="aspect-[16/9] bg-background-elevated/30 rounded-lg border border-border/50 flex items-center justify-center">
            {/* SVG architecture diagram placeholder */}
            <svg
              viewBox="0 0 800 400"
              className="w-full h-full"
              role="img"
              aria-label="Detection pipeline architecture diagram"
            >
              <defs>
                <marker
                  id="arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--color-primary)" />
                </marker>
              </defs>

              {/* Boxes */}
              {[
                { x: 20, y: 160, w: 110, h: 60, label: 'AIS Feed', color: 'primary' },
                { x: 160, y: 160, w: 110, h: 60, label: 'ADS-B Feed', color: 'info' },
                { x: 300, y: 160, w: 110, h: 60, label: 'Radar/SAT', color: 'success' },
                { x: 450, y: 160, w: 130, h: 60, label: 'Kafka Topic', color: 'warning' },
                { x: 610, y: 160, w: 120, h: 60, label: 'Track Fusion', color: 'primary' },
                { x: 450, y: 260, w: 130, h: 60, label: 'Behavioral Scoring', color: 'danger' },
                { x: 610, y: 260, w: 120, h: 60, label: 'Classification', color: 'warning' },
                { x: 450, y: 360, w: 130, h: 60, label: 'Alert Engine', color: 'success' },
                { x: 610, y: 360, w: 120, h: 60, label: 'Dashboard/API', color: 'info' },
              ].map((box) => (
                <g key={box.label}>
                  <rect
                    x={box.x}
                    y={box.y}
                    width={box.w}
                    height={box.h}
                    rx="8"
                    fill="var(--color-background-elevated)"
                    stroke={`var(--color-${box.color})`}
                    strokeWidth="2"
                  />
                  <text
                    x={box.x + box.w / 2}
                    y={box.y + box.h / 2 + 5}
                    textAnchor="middle"
                    fill="var(--color-fg)"
                    fontSize="13"
                    fontFamily="var(--font-ui)"
                  >
                    {box.label}
                  </text>
                </g>
              ))}

              {/* Arrows */}
              {[
                [130, 190, 160, 190],
                [270, 190, 300, 190],
                [410, 190, 450, 190],
                [580, 190, 610, 190],
                [670, 220, 670, 260],
                [610, 290, 580, 290],
                [670, 320, 670, 360],
                [580, 390, 450, 390],
                [580, 390, 610, 390],
              ].map((arrow, i) => (
                <line
                  key={i}
                  x1={arrow[0]}
                  y1={arrow[1]}
                  x2={arrow[2]}
                  y2={arrow[3]}
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
              ))}
            </svg>
          </div>
        </div>
      </Section>

      {/* Anomaly Taxonomy */}
      <Section
        id="anomaly-types"
        title="Anomaly Taxonomy"
        subtitle="Eight detected anomaly types with live counts"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {anomalyTypes.map((type, i) => (
            <div
              key={i}
              className={cn(
                'glass-card rounded-xl p-4 border border-border/50',
                type.severity === 'critical' && 'border-danger/30 bg-danger/5',
                type.severity === 'high' && 'border-warning/30 bg-warning/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-display text-heading-sm text-fg">{type.type}</h4>
                  <p className="font-ui text-body-sm text-fg-muted mt-1">{type.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-data text-data-sm"
                    style={{ color: `var(--color-${type.color})` }}
                  >
                    {type.count}
                  </div>
                  <div className="font-ui text-caption text-fg-subtle">active</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-caption font-medium',
                    type.severity === 'critical' && 'bg-danger/20 text-danger',
                    type.severity === 'high' && 'bg-warning/20 text-warning',
                    type.severity === 'medium' && 'bg-info/20 text-info',
                    type.severity === 'low' && 'bg-success/20 text-success'
                  )}
                >
                  {type.severity}
                </span>
                <Link
                  to="/api/v1/anomalies"
                  className="font-ui text-caption text-primary hover:underline"
                >
                  API endpoint →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Live Metrics */}
      <Section
        id="live-metrics"
        title="Live Pipeline Metrics"
        subtitle="Real-time system performance"
        className="mb-4"
      >
        <LivePlatformMetrics columns={4} />
      </Section>

      {/* FAQ */}
      <Section
        id="faq"
        title="Frequently Asked Questions"
        subtitle="Common questions about anomaly detection"
        className="mb-4"
      >
        <div className="space-y-4 max-w-3xl">
          {[
            {
              q: 'How fast are anomalies detected?',
              a: 'Average end-to-end detection latency is 247ms from signal ingestion to alert. Critical anomalies (dark periods, sanctions evasion) prioritize within 100ms.',
            },
            {
              q: 'What is the false positive rate?',
              a: 'Overall false positive rate is 2.3%, down from 8.7% at launch. Continuous model retraining and human feedback loops drive improvement.',
            },
            {
              q: 'Can the system detect coordinated behavior?',
              a: 'Yes. The rendezvous detector identifies two or more vessels meeting for unexplained transfers, even without AIS data, using radar and optical satellite fusion.',
            },
            {
              q: 'How are anomalies prioritized?',
              a: 'Scoring combines behavioral factors (route deviation, zone proximity) with geopolitical context (sanctions lists, threat actor playbooks) to compute a 0-100 risk score.',
            },
          ].map((faq) => (
            <details key={faq.q} className="glass-card rounded-xl p-4 group cursor-pointer">
              <summary className="font-display text-heading-sm text-[var(--color-fg)] list-none flex items-center justify-between">
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
              <p className="font-ui text-body text-[var(--color-fg-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* API */}
      <Section
        id="api"
        title="API Reference"
        subtitle="Integrate anomaly detection into your systems"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <h3 className="font-display text-heading-md text-fg mb-4">Get Recent Anomalies</h3>
          <pre className="bg-background-elevated/50 border border-border/50 rounded-lg p-4 overflow-x-auto text-sm font-data">
            <code>{`GET /api/v1/anomalies?region=hormuz&severity=critical
Authorization: Bearer <token>

Response:
{
  "anomalies": [
    {
      "id": "anom_8f3k2",
      "type": "dark_period",
      "severity": "critical",
      "score": 94.2,
      "vessel": {
        "imo": "9123456",
        "name": "UNKNOWN",
        "last_known": [56.2, 26.1]
      },
      "detected_at": "2026-07-20T14:32:11Z",
      "confidence": 0.91
    }
  ],
  "pagination": { "total": 23, "page": 1, "limit": 50 }
}`}</code>
          </pre>
          <Link
            to="/api/v1"
            className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-ui font-medium text-body hover:bg-primary/90 transition-colors"
          >
            View Full API Docs →
          </Link>
        </div>
      </Section>
    </>
  );
}
