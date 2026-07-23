import { Section } from '@/components/layout/Section';
import { MARITIME_METRICS, MetricGrid } from '@/components/data/MetricGrid';
import { APIExampleBlock } from '@/components/docs/APIExampleBlock';
import {
  DocCallout,
  DocCodeBlock,
  DocParagraph,
  DocumentationBlock,
} from '@/components/docs/DocumentationBlock';
import { EditorialMap } from '@/components/maps';
import { cn } from '@/utils/cn';

// ─── AIS Protocol Guide ───────────────────────────────────────────────────────

const aisMessageTypes = [
  {
    type: 1,
    name: 'Position Report Class A',
    desc: 'Primary position report for large vessels (>300 GT). Contains MMSI, status, speed, position, course, heading.',
  },
  {
    type: 3,
    name: 'Position Report Special',
    desc: 'Sent in response to interrogation. Identical payload to Type 1/2.',
  },
  {
    type: 4,
    name: 'Base Station Report',
    desc: 'Sent by AIS base stations every minute. Contains position of base station.',
  },
  {
    type: 5,
    name: 'Vessel Static Data',
    desc: 'Sent by Class A transponders every 6 minutes. Contains IMO, call sign, vessel name, dimensions, destination, ETA.',
  },
  {
    type: 18,
    name: 'Position Report Class B',
    desc: 'Standard position report for smaller vessels using Class B AIS transponders.',
  },
  {
    type: 21,
    name: 'Aids to Navigation',
    desc: 'Position and status of aids to navigation (buoys, beacons, lighthouses).',
  },
  {
    type: 24,
    name: 'Class B Static Data',
    desc: 'Static vessel data for Class B transponders. Sent every 6 minutes.',
  },
];

const aisFields = [
  {
    field: 'MMSI',
    bits: '30',
    type: 'uint',
    desc: 'Maritime Mobile Service Identity — 9-digit vessel identifier',
  },
  {
    field: 'Status',
    bits: '4',
    type: 'enum',
    desc: '0=underway, 1=at anchor, 5=moored, 15=not defined',
  },
  { field: 'ROT', bits: '8', type: 'int', desc: 'Rate of Turn in degrees/min (signed, ±720)' },
  { field: 'SOG', bits: '10', type: 'uint', desc: 'Speed Over Ground in 1/10 knot (0–102.2 kt)' },
  {
    field: 'Accuracy',
    bits: '1',
    type: 'bool',
    desc: 'Position accuracy flag (1 = < 10m DGNSS, 0 = > 10m)',
  },
  { field: 'Longitude', bits: '28', type: 'int', desc: 'WGS84 longitude in 1/10000 min (±180°)' },
  { field: 'Latitude', bits: '27', type: 'int', desc: 'WGS84 latitude in 1/10000 min (±90°)' },
  { field: 'COG', bits: '12', type: 'uint', desc: 'Course Over Ground in 1/10 degree (0–359.9°)' },
  {
    field: 'Heading',
    bits: '9',
    type: 'uint',
    desc: 'True heading in degrees (0–359, 511 = not available)',
  },
  {
    field: 'Timestamp',
    bits: '6',
    type: 'uint',
    desc: 'UTC second when report was generated (0–59)',
  },
];

export default function LearnAIS() {
  return (
    <>
      {/* Introduction */}
      <DocumentationBlock
        id="introduction"
        title="AIS Protocol & Visualization"
        subtitle="Understanding the Automatic Identification System — the primary data source for maritime domain awareness"
        level={1}
        badges={[
          { label: 'msg/min', value: '45.2K', color: 'primary' },
          { label: 'active tracks', value: '12.8K', color: 'success' },
          { label: 'sources', value: '247', color: 'info' },
        ]}
      >
        <DocParagraph>
          The Automatic Identification System (AIS) is a maritime VHF radio broadcast system that
          transmits vessel position, identity, speed, heading, and voyage information. Originally
          mandated by the IMO for vessels over 300 gross tons on international voyages, AIS now
          provides near-complete coverage of commercial maritime traffic globally.
        </DocParagraph>
        <DocParagraph>
          HormuzWatch ingests AIS from multiple sources: terrestrial receivers along coastlines,
          satellite receivers (S-AIS) in low Earth orbit, and Orbcomm/exactEarth aggregators —
          achieving <strong>45,200+ messages per minute</strong> over the Strait of Hormuz and
          Persian Gulf region.
        </DocParagraph>
        <DocCallout type="info" title="VHF Channels">
          AIS operates on VHF maritime channels 87B (161.975 MHz) and 88B (162.025 MHz). Class A
          transponders use TDMA self-organizing protocol; Class B use CSTDMA (carrier-sense). Range
          is typically 20–40 nautical miles for terrestrial reception.
        </DocCallout>
      </DocumentationBlock>

      {/* Live AIS Stream */}
      <Section
        id="live-stream"
        title="Live AIS Stream"
        subtitle="Real-time vessel positions across the region"
        className="mb-4"
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-data text-data-sm text-primary">LIVE AIS</span>
            </div>
          </div>
        </div>
        <MetricGrid metrics={MARITIME_METRICS} columns={4} className="mt-4" />
      </Section>

      {/* Message Format */}
      <DocumentationBlock
        id="message-format"
        title="AIS Message Format"
        subtitle="NMEA 0183 encoded binary payload structure"
        badges={[{ label: 'message types', value: '27', color: 'primary' }]}
      >
        <DocParagraph>
          AIS messages are encoded as NMEA 0183 sentences. The{' '}
          <code className="prose-code">!AIVDM</code> and <code className="prose-code">!AIVDO</code>{' '}
          sentence types carry AIS payload data. The payload is 6-bit ASCII armored binary. Each
          message type has a fixed structure defined in ITU-R M.1371-5.
        </DocParagraph>
        <DocCodeBlock
          language="nmea"
          filename="raw_ais_sentence.nmea"
          code={`!AIVDM,1,1,,A,15M67N0P01G?Uf6E,0*73
         │  │ │ │ │                │  └─ NMEA checksum
         │  │ │ │ └─ Payload (6-bit ASCII armored binary)
         │  │ │ └─ Radio channel (A = 161.975 MHz, B = 162.025 MHz)
         │  │ └─ Fragment index (1 of 1)
         │  └─── Total sentence count (1 = single sentence)
         └─────── Sentence identifier (!AIVDM = received, !AIVDO = own ship)`}
        />
      </DocumentationBlock>

      {/* Message Types */}
      <DocumentationBlock
        id="message-types"
        title="AIS Message Types"
        subtitle="ITU-R M.1371-5 defines 27 message types; these are the most common"
      >
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-background-elevated/50">
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider hidden md:table-cell">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {aisMessageTypes.map((mt) => (
                <tr
                  key={mt.type}
                  className="border-b border-border/30 hover:bg-background-elevated/30"
                >
                  <td className="px-4 py-3">
                    <span className="font-data text-data-sm text-primary font-bold">{mt.type}</span>
                  </td>
                  <td className="px-4 py-3 font-ui text-body-sm text-fg font-medium">{mt.name}</td>
                  <td className="px-4 py-3 font-ui text-body-sm text-fg-muted hidden md:table-cell">
                    {mt.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocumentationBlock>

      {/* Bit-Level Field Structure */}
      <DocumentationBlock
        id="bit-fields"
        title="Type 1 Field Structure"
        subtitle="Bit-level breakdown of the Class A position report"
      >
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border/50 bg-background-elevated/50">
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Field
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Bits
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {aisFields.map((f) => (
                <tr
                  key={f.field}
                  className="border-b border-border/30 hover:bg-background-elevated/30"
                >
                  <td className="px-4 py-3 font-data text-data-sm text-primary font-bold">
                    {f.field}
                  </td>
                  <td className="px-4 py-3 font-data text-caption text-fg-muted">{f.bits}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-caption',
                        f.type === 'uint' && 'bg-primary/10 text-primary',
                        f.type === 'int' && 'bg-info/10 text-info',
                        f.type === 'bool' && 'bg-success/10 text-success',
                        f.type === 'enum' && 'bg-warning/10 text-warning'
                      )}
                    >
                      {f.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-ui text-body-sm text-fg-muted">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocumentationBlock>

      {/* Dark Periods */}
      <DocumentationBlock
        id="dark-periods"
        title="Dark Periods — AIS Spoofing & Evasion"
        subtitle="How vessels evade detection and how HormuzWatch counters it"
        badges={[{ label: 'active dark vessels', value: '5', color: 'danger' }]}
      >
        <DocCallout type="danger" title="Critical Anomaly Type">
          A dark period occurs when a vessel's AIS transponder goes silent for an extended duration
          in a monitored zone. This is the most common form of maritime evasion and often precedes
          illicit transfers or sanctions violations.
        </DocCallout>
        <DocParagraph>
          HormuzWatch detects dark periods through three complementary methods:
        </DocParagraph>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'AIS Gap Detection',
              desc: 'Track continuity broken when vessel disappears from AIS for > 2 hours in monitored zone. Last known position retained, alert generated.',
              color: 'danger',
            },
            {
              title: 'SAR/Optical Fusion',
              desc: 'Synthetic Aperture Radar and Sentinel-2 imagery cross-references known vessel positions against AIS data to detect silent vessels.',
              color: 'warning',
            },
            {
              title: 'Behavioral Prediction',
              desc: 'Route prediction model computes expected position based on last known course/speed. Deviation triggers re-acquisition alert.',
              color: 'info',
            },
          ].map((card) => (
            <div
              key={card.title}
              className={cn(
                'glass-card rounded-xl p-4 border border-border/50',
                card.color === 'danger' && 'border-danger/20',
                card.color === 'warning' && 'border-warning/20',
                card.color === 'info' && 'border-info/20'
              )}
            >
              <h4
                className={cn(
                  'font-display text-heading-sm mb-2',
                  card.color === 'danger' && 'text-danger',
                  card.color === 'warning' && 'text-warning',
                  card.color === 'info' && 'text-info'
                )}
              >
                {card.title}
              </h4>
              <p className="font-ui text-body-sm text-fg-muted">{card.desc}</p>
            </div>
          ))}
        </div>
      </DocumentationBlock>

      {/* API */}
      <DocumentationBlock
        id="api"
        title="AIS API Reference"
        subtitle="Query vessel data and real-time AIS streams"
      >
        <div className="space-y-6">
          <APIExampleBlock
            method="GET"
            endpoint="/api/v1/vessels"
            description="List active vessels with optional region and status filters."
            params={[
              {
                name: 'region',
                type: 'string',
                description: 'Filter by region',
                example: 'hormuz',
              },
              {
                name: 'status',
                type: 'enum',
                description: 'AIS navigation status',
                example: 'underway',
              },
              {
                name: 'limit',
                type: 'number',
                description: 'Max results (default 100)',
                example: '50',
              },
            ]}
            examples={[
              {
                lang: 'curl',
                code: `curl -H "Authorization: Bearer $TOKEN" \\
  "https://api.hormuzwatch.com/api/v1/vessels?region=hormuz&limit=50"`,
              },
              {
                lang: 'js',
                code: `const res = await fetch('/api/v1/vessels?region=hormuz', {
  headers: { Authorization: \`Bearer \${token}\` }
});
const { vessels } = await res.json();`,
              },
              {
                lang: 'python',
                code: `import requests
vessels = requests.get(
  'https://api.hormuzwatch.com/api/v1/vessels',
  headers={'Authorization': f'Bearer {token}'},
  params={'region': 'hormuz', 'limit': 50}
).json()['vessels']`,
              },
            ]}
            sampleResponse={`{
  "vessels": [
    {
      "mmsi": "310123456",
      "imo": "9123456",
      "name": "PACIFIC HORIZON",
      "type": "Crude Oil Tanker",
      "flag": "ML",
      "position": { "lat": 26.127, "lon": 56.349 },
      "speed": 12.4,
      "course": 187.3,
      "heading": 190,
      "status": "underway_engine",
      "timestamp": "2026-07-20T03:42:11Z"
    }
  ],
  "total": 234,
  "region": "hormuz"
}`}
          />

          <APIExampleBlock
            method="WS"
            endpoint="/ws/ais"
            description="Real-time AIS position stream. Subscribe to all vessels or filter by region."
            examples={[
              {
                lang: 'js',
                code: `const ws = new WebSocket('wss://api.hormuzwatch.com/ws/ais');

ws.onopen = () => {
  // Subscribe to Hormuz region only
  ws.send(JSON.stringify({ action: 'subscribe', region: 'hormuz' }));
};

ws.onmessage = (e) => {
  const { type, data } = JSON.parse(e.data);
  if (type === 'telemetry') {
    console.log('Vessel update:', data.imo, data.lat, data.lon);
  }
};`,
              },
              {
                lang: 'python',
                code: `import asyncio, json, websockets

async def stream_ais():
    uri = "wss://api.hormuzwatch.com/ws/ais"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({"action": "subscribe", "region": "hormuz"}))
        async for msg in ws:
            data = json.loads(msg)
            print(f"{data['data']['name']} @ {data['data']['lat']},{data['data']['lon']}")

asyncio.run(stream_ais())`,
              },
            ]}
            sampleResponse={`// Streaming message (arrives every ~2s per vessel)
{
  "type": "telemetry",
  "data": {
    "mmsi": "310123456",
    "imo": "9123456",
    "name": "PACIFIC HORIZON",
    "lat": 26.127,
    "lon": 56.349,
    "speed": 12.4,
    "course": 187.3,
    "heading": 190,
    "timestamp": "2026-07-20T03:42:11Z"
  }
}`}
          />
        </div>
      </DocumentationBlock>

      {/* References */}
      <DocumentationBlock id="references" title="References & Standards">
        <div className="space-y-3">
          {[
            {
              label: 'ITU-R M.1371-5',
              desc: 'Technical characteristics for an automatic identification system using time-division multiple access in the VHF maritime mobile frequency band',
              url: 'https://www.itu.int/rec/R-REC-M.1371/en',
            },
            {
              label: 'SOLAS Chapter V, Regulation 19',
              desc: 'IMO requirement for AIS carriage on vessels > 300 GT on international voyages',
              url: 'https://www.imo.org/',
            },
            {
              label: 'NMEA 0183 Standard',
              desc: 'Serial communication standard for marine electronics including AIS talker sentences',
              url: 'https://www.nmea.org/',
            },
          ].map((ref) => (
            <div
              key={ref.label}
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
