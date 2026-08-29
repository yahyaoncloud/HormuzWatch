import { Link } from 'react-router';

import { APIExampleBlock } from '@/components/docs/APIExampleBlock';
import { DocCallout, DocParagraph, DocumentationBlock } from '@/components/docs/DocumentationBlock';
import { EditorialMap, type RegionKey } from '@/components/maps';
import { cn } from '@/utils/cn';

// ─── Regional intelligence guide ─────────────────────────────────────────────

const regions = [
  {
    id: 'hormuz',
    name: 'Strait of Hormuz',
    coords: [56.5, 26.5] as [number, number],
    zoom: 6,
    description:
      "The world's most critical maritime chokepoint. 21% of global oil transit passes through a waterway only 21 nautical miles wide at its narrowest point.",
    keyFacts: [
      { label: 'Width (narrowest)', value: '21 nm', color: 'danger' },
      { label: 'Global oil transit', value: '21%', color: 'warning' },
      { label: 'Vessels/day', value: '~17', color: 'primary' },
      { label: 'Risk score', value: '72/100', color: 'danger' },
    ],
    threats: [
      'AIS dark periods by Iranian-flagged tankers',
      'Mine warfare risk',
      'IRGCN fast-boat harassment',
      'Sanctions evasion ship-to-ship transfers',
    ],
    monitoring: [
      '24/7 AIS coverage via S-AIS constellation',
      'SAR satellite passes every 6h',
      'VIIRS thermal anomaly detection',
      'Real-time anomaly scoring at 2s cadence',
    ],
    href: '/intelligence/hormuz',
  },
  {
    id: 'red-sea',
    name: 'Red Sea / Bab-el-Mandeb',
    coords: [43.4, 14.5] as [number, number],
    zoom: 5,
    description:
      'The Bab-el-Mandeb strait connects the Red Sea to the Gulf of Aden. Houthi attacks since 2023 have dramatically elevated risk and rerouted major shipping lanes.',
    keyFacts: [
      { label: 'Width (narrowest)', value: '18 nm', color: 'danger' },
      { label: 'Transit rerouted', value: '~60%', color: 'danger' },
      { label: 'Vessels/day (peak)', value: '~50', color: 'primary' },
      { label: 'Risk score', value: '68/100', color: 'warning' },
    ],
    threats: [
      'Houthi anti-ship missile attacks',
      'Drone boat swarm tactics',
      'Loitering small craft',
      'Commercial vessel avoidance routing',
    ],
    monitoring: [
      'AIS disruption detection in Yemeni waters',
      'Radar-correlated vessel tracking',
      'Open-source incident reporting (UKMTO)',
      'Rerouting pattern analysis via Cape of Good Hope',
    ],
    href: '/intelligence/red-sea',
  },
  {
    id: 'suez',
    name: 'Suez Canal',
    coords: [32.5, 30.5] as [number, number],
    zoom: 7,
    description:
      'The Suez Canal is a 193km artificial waterway linking the Mediterranean to the Red Sea. Transit analytics track queue times, delay prediction, and lane utilization.',
    keyFacts: [
      { label: 'Length', value: '193 km', color: 'info' },
      { label: 'Transit time', value: '12–16h', color: 'primary' },
      { label: 'Annual transits', value: '~20K', color: 'primary' },
      { label: 'Risk score', value: '45/100', color: 'success' },
    ],
    threats: [
      'Single-vessel blockage risk (see Ever Given)',
      'Congestion and delay propagation',
      'Geopolitical closure risk',
    ],
    monitoring: [
      'Convoy formation tracking',
      'Queue length measurement',
      'Transit time prediction model',
      'Anchorage utilization',
    ],
    href: '/intelligence/suez',
  },
  {
    id: 'persian-gulf',
    name: 'Persian Gulf',
    coords: [51.0, 26.0] as [number, number],
    zoom: 5,
    description:
      'A semi-enclosed sea bordered by eight states, with major oil and LNG export terminals. High vessel density from tanker traffic, naval exercises, and fishing activity.',
    keyFacts: [
      { label: 'Area', value: '251K km²', color: 'info' },
      { label: 'Active vessels', value: '1,123', color: 'primary' },
      { label: 'Anomalies/day', value: '~28', color: 'warning' },
      { label: 'Risk score', value: '61/100', color: 'warning' },
    ],
    threats: [
      'Sanctions evasion via flag switches',
      'Iranian naval exercises',
      'Speed boat smuggling corridors',
      'Gas platform approach violations',
    ],
    monitoring: [
      'Comprehensive AIS coverage from UAE/Qatar receivers',
      'LNG terminal traffic analytics',
      'Military exercise zone alerting',
      'Oil platform exclusion zone monitoring',
    ],
    href: '/intelligence/persian-gulf',
  },
];

export default function LearnRegional() {
  return (
    <>
      {/* Introduction */}
      <DocumentationBlock
        id="introduction"
        title="Regional Analysis Guides"
        subtitle="Deep geopolitical and operational context for each strategic maritime chokepoint"
        level={1}
        badges={[
          { label: 'regions monitored', value: '4', color: 'primary' },
          { label: 'total vessels', value: '2,013', color: 'info' },
          { label: 'anomalies today', value: '76', color: 'danger' },
        ]}
      >
        <DocParagraph>
          HormuzWatch monitors four primary strategic maritime chokepoints in the Middle East and
          surrounding waters. Each region has distinct geopolitical context, threat profiles, data
          coverage characteristics, and operational monitoring priorities.
        </DocParagraph>
        <DocCallout type="info" title="Intelligence Currency">
          Regional risk scores are recomputed every 10 minutes using the latest anomaly detections,
          incident reports, and geopolitical event feeds. Historical trend data is available via the
          heatmap API for pattern analysis over the past 90 days.
        </DocCallout>
      </DocumentationBlock>

      {/* World Overview Map */}
      <DocumentationBlock
        id="overview-map"
        title="Strategic Overview"
        subtitle="All monitored regions — click to zoom"
      >
        <div className="relative aspect-[16/7] rounded-xl overflow-hidden glass-card border border-border/50">
          <EditorialMap
            region="world"
            className="w-full h-full"
            height="100%"
            showLayerControls={true}
            showMetricsRibbon={false}
          />
          <div className="absolute bottom-4 left-4 glass-card px-3 py-2 rounded-lg border border-border/50">
            <p className="font-ui text-caption text-fg-muted">
              4 monitored regions — click markers for detail
            </p>
          </div>
        </div>

        {/* Quick region jump */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {regions.map((r) => (
            <a
              key={r.id}
              href={`#${r.id}`}
              className="glass-card rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors text-center group"
            >
              <p className="font-ui text-body-sm font-medium text-fg group-hover:text-primary transition-colors">
                {r.name.split(' ')[0]}
              </p>
              <p className="font-data text-caption text-fg-muted mt-0.5">
                Risk {r.keyFacts[3].value}
              </p>
            </a>
          ))}
        </div>
      </DocumentationBlock>

      {/* Individual regions */}
      {regions.map((region) => (
        <DocumentationBlock
          key={region.id}
          id={region.id}
          title={region.name}
          subtitle={region.description}
          badges={region.keyFacts.slice(0, 2).map((f) => ({
            label: f.label,
            value: f.value,
            color: f.color as 'primary' | 'info' | 'success' | 'warning' | 'danger',
          }))}
        >
          {/* Map */}
          <div className="relative aspect-[16/7] rounded-xl overflow-hidden glass-card border border-border/50 mb-6">
            <EditorialMap
              region={region.id as RegionKey}
              className="w-full h-full"
              height="100%"
              showLayerControls={true}
              showMetricsRibbon={false}
            />
          </div>

          {/* Key facts + threats + monitoring */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stats */}
            <div className="glass-card rounded-xl p-4 border border-border/50">
              <h4 className="font-display text-heading-sm text-fg mb-3">Key Metrics</h4>
              <ul className="space-y-2">
                {region.keyFacts.map((fact) => (
                  <li key={fact.label} className="flex items-center justify-between">
                    <span className="font-ui text-body-sm text-fg-muted">{fact.label}</span>
                    <span
                      className={cn(
                        'font-data text-data-sm font-bold',
                        fact.color === 'danger' && 'text-danger',
                        fact.color === 'warning' && 'text-warning',
                        fact.color === 'primary' && 'text-primary',
                        fact.color === 'info' && 'text-info',
                        fact.color === 'success' && 'text-success'
                      )}
                    >
                      {fact.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Threats */}
            <div className="glass-card rounded-xl p-4 border border-border/50 border-danger/10">
              <h4 className="font-display text-heading-sm text-danger mb-3">Active Threats</h4>
              <ul className="space-y-2">
                {region.threats.map((threat) => (
                  <li key={threat} className="flex items-start gap-2">
                    <span className="text-danger mt-0.5 shrink-0">▸</span>
                    <span className="font-ui text-body-sm text-fg-muted">{threat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Monitoring */}
            <div className="glass-card rounded-xl p-4 border border-border/50 border-primary/10">
              <h4 className="font-display text-heading-sm text-primary mb-3">Monitoring Methods</h4>
              <ul className="space-y-2">
                {region.monitoring.map((method) => (
                  <li key={method} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 shrink-0">✓</span>
                    <span className="font-ui text-body-sm text-fg-muted">{method}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-4 flex gap-3">
            <Link
              to={region.href}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-ui font-medium text-body-sm hover:bg-primary/90 transition-colors"
            >
              Open Intelligence Portal →
            </Link>
            <Link
              to={`/intelligence/${region.id}`}
              className="px-4 py-2 glass-card border border-border/50 rounded-lg font-ui font-medium text-body-sm text-fg hover:border-primary/30 transition-colors"
            >
              Live Map
            </Link>
          </div>
        </DocumentationBlock>
      ))}

      {/* API */}
      <DocumentationBlock
        id="api"
        title="Regional Data API"
        subtitle="Query region-specific intelligence programmatically"
      >
        <APIExampleBlock
          method="GET"
          endpoint="/api/v1/regions/{id}/metrics"
          description="Get current situational metrics for a specific region."
          params={[
            {
              name: 'id',
              type: 'string',
              required: true,
              description: 'Region identifier',
              example: 'hormuz',
            },
          ]}
          examples={[
            {
              lang: 'curl',
              code: `curl -H "Authorization: Bearer $TOKEN" \\
  "https://api.hormuzwatch.com/api/v1/regions/hormuz/metrics"`,
            },
            {
              lang: 'js',
              code: `const res = await fetch('/api/v1/regions/hormuz/metrics', {
  headers: { Authorization: \`Bearer \${token}\` }
});
const metrics = await res.json();
// metrics.riskScore, .vessels, .anomalies, ...`,
            },
          ]}
          sampleResponse={`{
  "region": "hormuz",
  "riskScore": 72,
  "vessels": 234,
  "aircraft": 45,
  "anomalies": 3,
  "aisRate": 1200,
  "adsbRate": 800,
  "lastIncident": "2026-07-20T01:15:00Z",
  "updatedAt": "2026-07-20T03:42:00Z"
}`}
        />
      </DocumentationBlock>
    </>
  );
}
