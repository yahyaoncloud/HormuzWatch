import { APIExampleBlock } from '@/components/docs/APIExampleBlock';
import {
  DocCallout,
  DocCodeBlock,
  DocParagraph,
  DocumentationBlock,
} from '@/components/docs/DocumentationBlock';
import { EditorialMap } from '@/components/maps';
import { cn } from '@/utils/cn';

// ─── Satellite Intelligence Guide ─────────────────────────────────────────────

const satelliteSources = [
  {
    name: 'VIIRS (Suomi NPP / NOAA-20)',
    type: 'Thermal Infrared',
    resolution: '375m / pixel',
    revisit: '12 hrs',
    color: 'warning' as const,
    desc: 'Visible Infrared Imaging Radiometer Suite. Detects active fires, gas flaring, vessel night-light emissions, and industrial thermal anomalies.',
    useCases: [
      'Oil refinery fires',
      'Gas flaring events',
      'Vessel lighting at night',
      'Industrial activity spikes',
    ],
  },
  {
    name: 'Sentinel-2 (ESA Copernicus)',
    type: 'Multispectral (13 bands)',
    resolution: '10m / pixel (visible)',
    revisit: '5 days',
    color: 'info' as const,
    desc: 'Free, open-access multispectral imagery at 10m resolution. Used for vessel detection, oil spill monitoring, port construction analysis, and environmental change.',
    useCases: [
      'Vessel detection (anchored)',
      'Oil spill extent mapping',
      'Port / terminal change detection',
      'Coastal infrastructure monitoring',
    ],
  },
  {
    name: 'SAR (Sentinel-1 / Capella / ICEYE)',
    type: 'Synthetic Aperture Radar',
    resolution: '1–5m / pixel',
    revisit: '6 hrs (commercial)',
    color: 'primary' as const,
    desc: 'Cloud-penetrating SAR reveals vessels regardless of weather or darkness. Essential for detecting dark vessels that have disabled AIS and maritime spoofing.',
    useCases: [
      'Dark vessel detection',
      'All-weather vessel counting',
      'Ship-to-ship transfer detection',
      'Offshore platform activity',
    ],
  },
  {
    name: 'Planet Labs (PlanetScope)',
    type: 'True Color + NIR',
    resolution: '3m / pixel',
    revisit: 'Daily',
    color: 'success' as const,
    desc: 'Daily 3m imagery of the entire land surface. Used for port monitoring, vessel traffic analysis at terminals, and ground truth for AIS data.',
    useCases: [
      'Daily port congestion view',
      'Vessel queue monitoring',
      'Terminal loading activity',
      'Ground facility changes',
    ],
  },
];

const detectionChain = [
  {
    step: 1,
    name: 'Tile Acquisition',
    desc: 'Scheduled fetch of latest satellite imagery tiles covering monitored regions. VIIRS every 12h, Sentinel-2 on overpass, SAR 6h cadence.',
  },
  {
    step: 2,
    name: 'Cloud Masking',
    desc: 'Cloud probability layer applied (Sentinel-2 Cloud Detector). SAR unaffected. VIIRS cloud flags applied from the level-2 product.',
  },
  {
    step: 3,
    name: 'Vessel Detection',
    desc: 'CNN-based object detector (YOLOv8 fine-tuned on maritime imagery) identifies vessel candidates. Outputs bounding boxes with confidence scores.',
  },
  {
    step: 4,
    name: 'AIS Correlation',
    desc: 'Each detected object matched to the nearest AIS track within 500m. Unmatched detections flagged as potential dark vessels.',
  },
  {
    step: 5,
    name: 'Feature Extraction',
    desc: 'Vessel length, beam, shadow angle, and wake pattern extracted. Used for vessel type classification.',
  },
  {
    step: 6,
    name: 'Alert Generation',
    desc: 'Dark vessel detections with confidence > 0.85 generate anomaly events. Correlated with known threat patterns and sanctions lists.',
  },
];

export default function LearnSatellite() {
  return (
    <>
      {/* Introduction */}
      <DocumentationBlock
        id="introduction"
        title="Satellite Intelligence"
        subtitle="How HormuzWatch integrates VIIRS, Sentinel-2, and SAR imagery for maritime domain awareness"
        level={1}
        badges={[
          { label: 'satellite sources', value: '4', color: 'primary' },
          { label: 'dark vessels detected', value: '12', color: 'danger' },
          { label: 'SAR revisit', value: '6h', color: 'info' },
        ]}
      >
        <DocParagraph>
          AIS-based monitoring has a fundamental vulnerability: vessels can simply turn their
          transponders off. Satellite imagery — particularly Synthetic Aperture Radar — provides a{' '}
          <strong>physics-based detection mechanism</strong> that is immune to transponder
          manipulation. HormuzWatch fuses four satellite sources with AIS data to achieve
          near-complete coverage of strategic maritime zones.
        </DocParagraph>
        <DocCallout type="tip" title="SAR vs. Optical">
          SAR (Radar) penetrates clouds and works day or night, making it the primary tool for
          all-weather dark vessel detection. Optical imagery (Sentinel-2, Planet) provides higher
          detail for vessel identification, oil spill mapping, and port change detection — but is
          blocked by cloud cover.
        </DocCallout>
      </DocumentationBlock>

      {/* Satellite Map */}
      <DocumentationBlock
        id="satellite-view"
        title="Live Satellite Layer"
        subtitle="Sentinel-2 true-color imagery with detected vessel overlay"
      >
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden glass-card border border-border/50">
          <EditorialMap
            region="persianGulf"
            className="w-full h-full"
            height="100%"
            showLayerControls={true}
            showMetricsRibbon={false}
          />
          <div className="absolute top-4 left-4 glass-card px-3 py-2 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-info" />
              <span className="font-data text-data-sm text-info">SAT LAYER</span>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 glass-card px-3 py-2 rounded-lg border border-border/50">
            <p className="font-ui text-caption text-fg-muted">Sentinel-2 · 5-day composite</p>
          </div>
        </div>

        {/* VIIRS fire events legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'SAR dark vessels', value: '12', color: 'danger' },
            { label: 'VIIRS fire events', value: '8', color: 'warning' },
            { label: 'Sentinel-2 age', value: '2 days', color: 'info' },
            { label: 'AIS correlated', value: '89%', color: 'success' },
          ].map((m) => (
            <div
              key={m.label}
              className="glass-card rounded-xl p-3 border border-border/50 text-center"
            >
              <div
                className={cn(
                  'font-data text-data font-bold',
                  m.color === 'danger' && 'text-danger',
                  m.color === 'warning' && 'text-warning',
                  m.color === 'info' && 'text-info',
                  m.color === 'success' && 'text-success'
                )}
              >
                {m.value}
              </div>
              <div className="font-ui text-caption text-fg-muted mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </DocumentationBlock>

      {/* Data Sources */}
      <DocumentationBlock
        id="sources"
        title="Satellite Data Sources"
        subtitle="Four complementary sensors providing different perspectives on the same maritime domain"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {satelliteSources.map((src) => (
            <article
              key={src.name}
              className={cn(
                'glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-display text-heading-sm text-fg">{src.name}</h4>
                  <span
                    className={cn(
                      'inline-block mt-1 px-2 py-0.5 rounded text-caption font-medium',
                      src.color === 'warning' && 'bg-warning/10 text-warning',
                      src.color === 'info' && 'bg-info/10 text-info',
                      src.color === 'primary' && 'bg-primary/10 text-primary',
                      src.color === 'success' && 'bg-success/10 text-success'
                    )}
                  >
                    {src.type}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-data text-caption text-fg-muted">{src.resolution}</div>
                  <div className="font-data text-caption text-fg-subtle">{src.revisit} revisit</div>
                </div>
              </div>
              <p className="font-ui text-body-sm text-fg-muted mb-4">{src.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {src.useCases.map((uc) => (
                  <span
                    key={uc}
                    className="px-2 py-0.5 bg-background-elevated border border-border/50 rounded text-caption text-fg-muted"
                  >
                    {uc}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </DocumentationBlock>

      {/* Detection Chain */}
      <DocumentationBlock
        id="detection-chain"
        title="Dark Vessel Detection Pipeline"
        subtitle="From satellite imagery to confirmed dark vessel anomaly"
      >
        <div className="space-y-3">
          {detectionChain.map((step) => (
            <div
              key={step.step}
              className="flex gap-4 glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-data text-data font-bold shrink-0">
                {step.step}
              </div>
              <div>
                <h4 className="font-display text-heading-sm text-fg mb-1">{step.name}</h4>
                <p className="font-ui text-body-sm text-fg-muted">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <DocCallout type="info" title="Model Performance">
          The vessel detection CNN achieves 94.3% precision and 91.7% recall on the HormuzWatch
          maritime imagery benchmark (2,400 scenes, 18,000 labeled vessels). SAR model trained on
          Sentinel-1 IW mode.
        </DocCallout>
      </DocumentationBlock>

      {/* VIIRS Fire Detection */}
      <DocumentationBlock
        id="viirs"
        title="VIIRS Fire & Thermal Anomalies"
        subtitle="What thermal events reveal about maritime and industrial activity"
      >
        <DocParagraph>
          The VIIRS instrument aboard Suomi NPP and NOAA-20 satellites detects active fire/thermal
          anomalies at 375m resolution. In the context of maritime intelligence, VIIRS provides
          three distinct signals:
        </DocParagraph>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: '🔥',
              title: 'Gas Flaring',
              desc: 'Persistent bright thermal spots over known offshore platforms indicate LNG/oil production activity. Flaring patterns reveal operational tempo.',
              color: 'warning' as const,
            },
            {
              icon: '⚡',
              title: 'Industrial Fires',
              desc: 'Sudden new thermal detections at refineries or petrochemical facilities indicate incidents, explosions, or deliberate sabotage.',
              color: 'danger' as const,
            },
            {
              icon: '🚢',
              title: 'Vessel Lighting',
              desc: 'Bright vessels at night (fishing fleets, offshore operations) visible in VIIRS Day/Night Band at 750m resolution.',
              color: 'primary' as const,
            },
          ].map((card) => (
            <div
              key={card.title}
              className={cn(
                'glass-card rounded-xl p-5 border border-border/50',
                card.color === 'warning' && 'border-warning/20',
                card.color === 'danger' && 'border-danger/20',
                card.color === 'primary' && 'border-primary/20'
              )}
            >
              <div className="text-2xl mb-3" aria-hidden>
                {card.icon}
              </div>
              <h4
                className={cn(
                  'font-display text-heading-sm mb-2',
                  card.color === 'warning' && 'text-warning',
                  card.color === 'danger' && 'text-danger',
                  card.color === 'primary' && 'text-primary'
                )}
              >
                {card.title}
              </h4>
              <p className="font-ui text-body-sm text-fg-muted">{card.desc}</p>
            </div>
          ))}
        </div>
      </DocumentationBlock>

      {/* Data Format */}
      <DocumentationBlock
        id="data-format"
        title="Satellite Event Data Format"
        subtitle="How satellite detections are represented in the HormuzWatch data model"
      >
        <DocCodeBlock
          language="json"
          filename="satellite_event.json"
          code={`{
  "id": "sat_viirs_20260720_0341_001",
  "source": "VIIRS_NOAA20",
  "type": "fire_detection",
  "coordinates": [56.234, 26.117],
  "confidence": "high",            // nominal | low | high
  "frp": 42.7,                     // fire radiative power (MW)
  "brightness": 412.3,             // brightness temperature (K)
  "detected_at": "2026-07-20T03:41:00Z",
  "satellite_overpass": "2026-07-20T03:38:22Z",
  "ais_correlation": {
    "matched": false,              // no AIS vessel at this location
    "nearest_mmsi": null,
    "dark_vessel_candidate": true
  },
  "region": "hormuz"
}`}
        />
      </DocumentationBlock>

      {/* API */}
      <DocumentationBlock
        id="api"
        title="Satellite API Reference"
        subtitle="Access fire events and vessel detection results programmatically"
      >
        <APIExampleBlock
          method="GET"
          endpoint="/api/v1/satellite/fires"
          description="Returns VIIRS fire detection events for the given region and time window."
          params={[
            { name: 'region', type: 'string', description: 'Geographic region', example: 'hormuz' },
            {
              name: 'since',
              type: 'ISO8601',
              description: 'Events after this time',
              example: '2026-07-20T00:00:00Z',
            },
            {
              name: 'confidence',
              type: 'enum',
              description: 'Minimum detection confidence',
              example: 'high',
            },
          ]}
          examples={[
            {
              lang: 'curl',
              code: `curl -H "Authorization: Bearer $TOKEN" \\
  "https://api.hormuzwatch.com/api/v1/satellite/fires?region=hormuz&confidence=high"`,
            },
            {
              lang: 'js',
              code: `const res = await fetch('/api/v1/satellite/fires?region=hormuz&confidence=high', {
  headers: { Authorization: \`Bearer \${token}\` }
});
const { events } = await res.json();
// events[i].coordinates, .frp, .dark_vessel_candidate`,
            },
            {
              lang: 'python',
              code: `import requests
events = requests.get(
  'https://api.hormuzwatch.com/api/v1/satellite/fires',
  headers={'Authorization': f'Bearer {token}'},
  params={'region': 'hormuz', 'confidence': 'high'}
).json()['events']`,
            },
          ]}
          sampleResponse={`{
  "events": [
    {
      "id": "sat_viirs_20260720_0341_001",
      "source": "VIIRS_NOAA20",
      "type": "fire_detection",
      "coordinates": [56.234, 26.117],
      "confidence": "high",
      "frp": 42.7,
      "dark_vessel_candidate": true,
      "detected_at": "2026-07-20T03:41:00Z"
    }
  ],
  "total": 8,
  "region": "hormuz"
}`}
        />
      </DocumentationBlock>

      {/* References */}
      <DocumentationBlock id="references" title="References & Data Access">
        <div className="space-y-3">
          {[
            {
              label: 'NASA VIIRS Active Fire',
              desc: 'NASA FIRMS near real-time VIIRS fire detection data. Free access via API.',
              url: 'https://firms.modaps.eosdis.nasa.gov/',
            },
            {
              label: 'Copernicus Open Access Hub',
              desc: 'ESA Sentinel-1/2 imagery. Free access for research and government use.',
              url: 'https://scihub.copernicus.eu/',
            },
            {
              label: 'ICEYE SAR Services',
              desc: 'Commercial SAR with 6h revisit for maritime domain awareness.',
              url: 'https://www.iceye.com/',
            },
          ].map((ref, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-4 border border-border/50 flex flex-col md:flex-row md:items-center gap-2"
            >
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-data text-data-sm text-primary hover:underline shrink-0"
              >
                {ref.label}
              </a>
              <span className="text-fg-subtle hidden md:block">—</span>
              <p className="font-ui text-body-sm text-fg-muted">{ref.desc}</p>
            </div>
          ))}
        </div>
      </DocumentationBlock>
    </>
  );
}
