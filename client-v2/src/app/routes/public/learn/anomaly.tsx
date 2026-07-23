import { APIExampleBlock } from '@/components/docs/APIExampleBlock';
import { DocCallout, DocParagraph, DocumentationBlock } from '@/components/docs/DocumentationBlock';
import { type Incident, IncidentFeed } from '@/components/docs/IncidentFeed';
import { EditorialMap } from '@/components/maps';
import { cn } from '@/utils/cn';

// ─── Sample anomalies ─────────────────────────────────────────────────────────

const SAMPLE_INCIDENTS: Incident[] = [
  {
    id: 'a-001',
    type: 'anomaly',
    severity: 'critical',
    title: 'AIS Dark Period — Unnamed Tanker',
    description: 'Transponder silent 6h in Hormuz chokepoint. Last position: 26.1°N 56.3°E',
    region: 'Hormuz Strait',
    timestamp: Date.now() - 900_000,
    status: 'investigating',
    tags: ['dark-period', 'tanker'],
  },
  {
    id: 'a-002',
    type: 'security',
    severity: 'critical',
    title: 'Sanctions List Match — Vessel IRN3312',
    description: 'MMSI 422012345 matches OFAC SDN list. Flag: Iran (Islamic Republic of).',
    region: 'Persian Gulf',
    timestamp: Date.now() - 1_800_000,
    status: 'open',
    tags: ['sanctions', 'iran'],
  },
  {
    id: 'a-003',
    type: 'anomaly',
    severity: 'high',
    title: 'Suspected Rendezvous — 2 Vessels',
    description: 'PACIFIC QUEEN and unnamed vessel station-keeping for 3h in open water.',
    region: 'Gulf of Oman',
    timestamp: Date.now() - 3_600_000,
    status: 'investigating',
    tags: ['rendezvous', 'ship-to-ship'],
  },
  {
    id: 'a-004',
    type: 'anomaly',
    severity: 'high',
    title: 'Route Deviation — Container Vessel',
    description:
      'Vessel departed declared route by 47nm. New course consistent with Bandar Abbas approach.',
    region: 'Arabian Sea',
    timestamp: Date.now() - 5_400_000,
    status: 'open',
    tags: ['route-deviation'],
  },
  {
    id: 'a-005',
    type: 'anomaly',
    severity: 'medium',
    title: 'Loitering Detected — 4 Vessels',
    description: 'Cluster of 4 small craft station-keeping near Bab-el-Mandeb chokepoint.',
    region: 'Bab-el-Mandeb',
    timestamp: Date.now() - 7_200_000,
    status: 'open',
    tags: ['loitering'],
  },
  {
    id: 'a-006',
    type: 'anomaly',
    severity: 'medium',
    title: 'Speed Anomaly — Bulk Carrier',
    description: 'Vessel decelerated from 14kt to 0.2kt without anchor status change.',
    region: 'Red Sea',
    timestamp: Date.now() - 10_800_000,
    status: 'open',
    tags: ['speed-anomaly'],
  },
  {
    id: 'a-007',
    type: 'alert',
    severity: 'low',
    title: 'Flag Switch Detected',
    description:
      'Vessel re-flagged from Liberia to Comoros within 24h. Common sanctions evasion tactic.',
    region: 'Indian Ocean',
    timestamp: Date.now() - 14_400_000,
    status: 'resolved',
    tags: ['flag-switch'],
  },
];

const anomalyCategories = [
  {
    id: 'dark-period',
    name: 'Dark Period',
    severity: 'critical' as const,
    icon: '🕳️',
    definition: 'AIS transponder disabled for > 2 hours within a monitored zone.',
    indicators: [
      'No position updates in AIS stream',
      'Last known position in monitored area',
      'Vessel class mandated to transmit',
    ],
    count: 5,
    color: 'danger',
    riskScore: 94,
  },
  {
    id: 'sanctions-evasion',
    name: 'Sanctions Evasion',
    severity: 'critical' as const,
    icon: '🔒',
    definition: 'MMSI, IMO, or vessel name matches sanctioned entity list (OFAC, UN, EU).',
    indicators: ['MMSI on SDN list', 'IMO on OFAC list', 'Flag state sanctioned'],
    count: 2,
    color: 'danger',
    riskScore: 98,
  },
  {
    id: 'rendezvous',
    name: 'Rendezvous',
    severity: 'critical' as const,
    icon: '🤝',
    definition:
      'Two or more vessels converge and station-keep in an unexpected location for > 30 minutes.',
    indicators: [
      'Convergent courses',
      'Speed drops to < 1kt',
      'Duration > 30 min',
      'Open-water location',
    ],
    count: 3,
    color: 'danger',
    riskScore: 88,
  },
  {
    id: 'route-deviation',
    name: 'Route Deviation',
    severity: 'high' as const,
    icon: '📐',
    definition:
      'Vessel departs declared destination route by > 5 nautical miles without evident reason.',
    indicators: ['Cross-track error > 5nm', 'Waypoint mismatch', 'Unreported destination'],
    count: 12,
    color: 'warning',
    riskScore: 72,
  },
  {
    id: 'loitering',
    name: 'Loitering',
    severity: 'medium' as const,
    icon: '⏸️',
    definition: 'Station-keeping in an unexpected area with no declared anchor status.',
    indicators: ['SOG < 1kt', 'No anchor status', 'Duration > 60 min', 'Unusual location'],
    count: 18,
    color: 'warning',
    riskScore: 61,
  },
  {
    id: 'speed-anomaly',
    name: 'Speed Anomaly',
    severity: 'medium' as const,
    icon: '⚡',
    definition: 'Speed change inconsistent with vessel class and operating conditions.',
    indicators: ['SOG > vessel class max', 'Sudden deceleration', 'SOG inconsistent with status'],
    count: 23,
    color: 'info',
    riskScore: 45,
  },
  {
    id: 'flag-switch',
    name: 'Flag Switch',
    severity: 'medium' as const,
    icon: '🏴',
    definition:
      'Vessel changes flag state within a short period — common tactic to obscure sanctioned ownership.',
    indicators: [
      'Flag state change in < 7 days',
      'New flag is common evasion jurisdiction',
      'MMSI unchanged',
    ],
    count: 7,
    color: 'info',
    riskScore: 55,
  },
  {
    id: 'pattern-match',
    name: 'Threat Pattern Match',
    severity: 'high' as const,
    icon: '🎯',
    definition:
      'Vessel behavior matches a known threat actor playbook from historical intelligence.',
    indicators: [
      'Route matches known smuggling lane',
      'Timing matches known transfer schedule',
      'Behavioral signature match > 80%',
    ],
    count: 6,
    color: 'warning',
    riskScore: 81,
  },
];

export default function LearnAnomaly() {
  return (
    <>
      {/* Introduction */}
      <DocumentationBlock
        id="introduction"
        title="Anomaly Taxonomy"
        subtitle="A comprehensive classification of maritime anomalies detected by HormuzWatch"
        level={1}
        badges={[
          { label: 'types', value: '8', color: 'primary' },
          { label: 'active now', value: '76', color: 'danger' },
          { label: 'false positive rate', value: '2.3%', color: 'success' },
        ]}
      >
        <DocParagraph>
          HormuzWatch classifies detected anomalies into eight categories based on the behavioral
          signature of the event. Each category carries a <strong>base risk score</strong> that is
          modulated by geopolitical context, vessel history, and corroborating signals from other
          sources.
        </DocParagraph>
        <DocParagraph>
          The taxonomy is aligned with IMO, INTERPOL, and US Navy doctrine for maritime domain
          awareness. It covers both <strong>intent-based</strong> anomalies (sanctions evasion,
          pattern match) and
          <strong> operational</strong> anomalies (route deviation, speed anomaly) — the former
          weighted significantly higher.
        </DocParagraph>
        <DocCallout type="warning" title="Anomalies vs. Incidents">
          An <strong>anomaly</strong> is an automatically detected deviation from expected behavior.
          An
          <strong> incident</strong> is an anomaly that has been reviewed by an analyst and
          escalated. All incidents originate as anomalies, but not all anomalies become incidents.
        </DocCallout>
      </DocumentationBlock>

      {/* Live Anomaly Map */}
      <DocumentationBlock
        id="live-map"
        title="Live Anomaly Map"
        subtitle="Active anomalies — updated every 30 seconds"
        badges={[{ label: 'active anomalies', value: '76', color: 'danger' }]}
      >
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden glass-card border border-border/50">
          <EditorialMap
            region="hormuz"
            className="w-full h-full"
            height="100%"
            showLayerControls={true}
            showMetricsRibbon={false}
          />
          <div className="absolute top-4 left-4 glass-card px-3 py-2 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
              </span>
              <span className="font-data text-data-sm text-danger">LIVE ANOMALIES</span>
            </div>
          </div>
        </div>
      </DocumentationBlock>

      {/* Live Feed */}
      <DocumentationBlock
        id="live-feed"
        title="Active Anomaly Feed"
        subtitle="Ranked by severity and recency"
      >
        <IncidentFeed incidents={SAMPLE_INCIDENTS} showFilters maxItems={7} />
      </DocumentationBlock>

      {/* Taxonomy Grid */}
      <DocumentationBlock
        id="taxonomy"
        title="Anomaly Classification Taxonomy"
        subtitle="Definitions, indicators, and risk scores for each category"
      >
        <div className="space-y-4">
          {anomalyCategories.map((cat) => (
            <article
              key={cat.id}
              className={cn(
                'glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all',
                cat.color === 'danger' && cat.riskScore > 85 && 'border-danger/20 bg-danger/5'
              )}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Icon + name */}
                <div className="flex items-center gap-3 md:w-52 md:shrink-0">
                  <span className="text-3xl" aria-hidden>
                    {cat.icon}
                  </span>
                  <div>
                    <h3 className="font-display text-heading-sm text-fg">{cat.name}</h3>
                    <span
                      className={cn(
                        'inline-block mt-1 px-2 py-0.5 rounded text-caption font-medium',
                        cat.color === 'danger' && 'bg-danger/15 text-danger',
                        cat.color === 'warning' && 'bg-warning/15 text-warning',
                        cat.color === 'info' && 'bg-info/15 text-info'
                      )}
                    >
                      {cat.severity}
                    </span>
                  </div>
                </div>

                {/* Definition + indicators */}
                <div className="flex-1">
                  <p className="font-ui text-body-sm text-fg-muted mb-3">{cat.definition}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.indicators.map((ind) => (
                      <span
                        key={ind}
                        className="px-2 py-0.5 bg-background-elevated border border-border/50 rounded text-caption text-fg-muted"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-1 md:w-24 md:shrink-0">
                  <div className="text-center">
                    <div
                      className={cn(
                        'font-data text-data-lg font-bold',
                        cat.color === 'danger' && 'text-danger',
                        cat.color === 'warning' && 'text-warning',
                        cat.color === 'info' && 'text-info'
                      )}
                    >
                      {cat.riskScore}
                    </div>
                    <div className="font-ui text-caption text-fg-muted">risk score</div>
                  </div>
                  <div className="text-center">
                    <div className="font-data text-data font-bold text-fg">{cat.count}</div>
                    <div className="font-ui text-caption text-fg-muted">active</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </DocumentationBlock>

      {/* Risk Scoring */}
      <DocumentationBlock
        id="risk-scoring"
        title="Risk Score Calculation"
        subtitle="How the 0–100 risk score is computed from raw anomaly signals"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6 border border-border/50">
            <h4 className="font-display text-heading-sm text-fg mb-4">Scoring Factors</h4>
            <ul className="space-y-3">
              {[
                { factor: 'Base anomaly score', weight: '40%', color: 'primary' },
                { factor: 'Geopolitical context', weight: '20%', color: 'warning' },
                { factor: 'Vessel history', weight: '15%', color: 'info' },
                { factor: 'Corroborating signals', weight: '15%', color: 'success' },
                { factor: 'Zone proximity', weight: '10%', color: 'danger' },
              ].map((f) => (
                <li key={f.factor} className="flex items-center justify-between">
                  <span className="font-ui text-body-sm text-fg-muted">{f.factor}</span>
                  <span
                    className={cn(
                      'font-data text-data-sm font-bold',
                      f.color === 'primary' && 'text-primary',
                      f.color === 'warning' && 'text-warning',
                      f.color === 'info' && 'text-info',
                      f.color === 'success' && 'text-success',
                      f.color === 'danger' && 'text-danger'
                    )}
                  >
                    {f.weight}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-xl p-6 border border-border/50">
            <h4 className="font-display text-heading-sm text-fg mb-4">Score Bands</h4>
            <ul className="space-y-3">
              {[
                {
                  range: '90–100',
                  label: 'Critical',
                  color: 'danger',
                  desc: 'Immediate analyst review required',
                },
                {
                  range: '70–89',
                  label: 'High',
                  color: 'warning',
                  desc: 'Escalate within 15 minutes',
                },
                {
                  range: '50–69',
                  label: 'Medium',
                  color: 'info',
                  desc: 'Monitor, escalate if corroborated',
                },
                { range: '0–49', label: 'Low', color: 'success', desc: 'Log and review in batch' },
              ].map((band) => (
                <li key={band.range} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'font-data text-caption font-bold px-2 py-0.5 rounded shrink-0',
                      band.color === 'danger' && 'bg-danger/15 text-danger',
                      band.color === 'warning' && 'bg-warning/15 text-warning',
                      band.color === 'info' && 'bg-info/15 text-info',
                      band.color === 'success' && 'bg-success/15 text-success'
                    )}
                  >
                    {band.range}
                  </span>
                  <div>
                    <span className="font-ui text-body-sm font-medium text-fg">{band.label}</span>
                    <p className="font-ui text-caption text-fg-muted">{band.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DocumentationBlock>

      {/* API */}
      <DocumentationBlock
        id="api"
        title="Anomaly API Reference"
        subtitle="Query anomalies and subscribe to real-time detection events"
      >
        <APIExampleBlock
          method="GET"
          endpoint="/api/v1/anomalies"
          description="Retrieve detected anomalies with filters for region, type, and severity."
          params={[
            {
              name: 'region',
              type: 'string',
              description: 'Geographic region filter',
              example: 'hormuz',
            },
            { name: 'type', type: 'enum', description: 'Anomaly category', example: 'dark_period' },
            {
              name: 'severity',
              type: 'enum',
              description: 'Minimum severity',
              example: 'critical',
            },
            {
              name: 'since',
              type: 'ISO8601',
              description: 'Events after this timestamp',
              example: '2026-07-20T00:00:00Z',
            },
          ]}
          examples={[
            {
              lang: 'curl',
              code: `curl -H "Authorization: Bearer $TOKEN" \\
  "https://api.hormuzwatch.com/api/v1/anomalies?region=hormuz&severity=critical"`,
            },
            {
              lang: 'js',
              code: `const res = await fetch('/api/v1/anomalies?region=hormuz&severity=critical', {
  headers: { Authorization: \`Bearer \${token}\` }
});
const { anomalies } = await res.json();`,
            },
            {
              lang: 'python',
              code: `import requests
anomalies = requests.get(
  'https://api.hormuzwatch.com/api/v1/anomalies',
  headers={'Authorization': f'Bearer {token}'},
  params={'region': 'hormuz', 'severity': 'critical'}
).json()['anomalies']`,
            },
          ]}
          sampleResponse={`{
  "anomalies": [
    {
      "id": "anom_8f3k2",
      "type": "dark_period",
      "severity": "critical",
      "score": 94.2,
      "vessel": { "imo": "9123456", "name": "UNKNOWN", "last_known": [56.2, 26.1] },
      "detected_at": "2026-07-20T03:32:11Z",
      "confidence": 0.91,
      "status": "investigating"
    }
  ],
  "pagination": { "total": 23, "page": 1, "limit": 50 }
}`}
        />
      </DocumentationBlock>
    </>
  );
}
