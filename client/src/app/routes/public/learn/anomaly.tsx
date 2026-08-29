import { APIExampleBlock } from '@/components/docs/APIExampleBlock';
import { DocCallout, DocParagraph, DocumentationBlock } from '@/components/docs/DocumentationBlock';
import { type Incident, IncidentFeed } from '@/components/docs/IncidentFeed';
import { EditorialMap } from '@/components/maps';
import { cn } from '@/utils/cn';

// ─── Sample anomalies ─────────────────────────────────────────────────────────

const SAMPLE_INCIDENTS: Incident[] = [];

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
          { label: 'types', value: '—', color: 'primary' },
          { label: 'active now', value: '—', color: 'danger' },
          { label: 'false positive rate', value: '—', color: 'success' },
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
        badges={[{ label: 'active anomalies', value: '—', color: 'danger' }]}
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
        <div className="glass-card rounded-xl p-6 border border-border/50 text-center">
          <p className="font-ui text-body text-fg-muted">
            Anomaly classification taxonomy will be available when connected to a live data source.
          </p>
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
        />
      </DocumentationBlock>
    </>
  );
}
