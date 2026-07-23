import { Section } from '@/components/layout/Section';
import { AVIATION_METRICS, MetricGrid } from '@/components/data/MetricGrid';
import { APIExampleBlock } from '@/components/docs/APIExampleBlock';
import {
  DocCallout,
  DocCodeBlock,
  DocParagraph,
  DocumentationBlock,
} from '@/components/docs/DocumentationBlock';
import { EditorialMap } from '@/components/maps';
import { cn } from '@/utils/cn';

// ─── ADS-B Protocol Guide ───────────────────────────────────────────────────────

const adsbMessageTypes = [
  {
    type: '1-4',
    name: 'Airborne Position',
    desc: 'Barometric altitude, lat/lon, airborne position with NIC/NAC integrity',
  },
  { type: '5-8', name: 'Surface Position', desc: 'Ground position, ground track, movement status' },
  {
    type: '9-18',
    name: 'Airborne Velocity',
    desc: 'Ground speed, heading, vertical rate, velocity quality indicators',
  },
  {
    type: '19',
    name: 'Airborne Position (Long)',
    desc: 'Extended squitter with full position data',
  },
  { type: '20', name: 'Airborne Position (RTCA)', desc: 'RTCA DO-260B format for 1090ES' },
  {
    type: '21',
    name: 'Airborne Position (TIS-B)',
    desc: 'Traffic Information Service-B relayed position',
  },
  {
    type: '22',
    name: 'Channel Status',
    desc: 'Link technology, channel availability, GPS quality',
  },
  {
    type: '24',
    name: 'Aircraft Identification',
    desc: 'Aircraft callsign, type, emitter category (sent every 5s)',
  },
  {
    type: '28',
    name: 'Aircraft Status',
    desc: 'Emergency/priority status, ACAS resolution advisories, ident switch',
  },
  {
    type: '29',
    name: 'Target State',
    desc: 'TIS-B target state report with position, velocity, intent',
  },
];

const adsbFields = [
  {
    field: 'ICAO24',
    bits: '24',
    type: 'hex',
    desc: '24-bit ICAO aircraft address (unique per airframe)',
  },
  { field: 'Type Code', bits: '5', type: 'uint', desc: 'Message type 1-28 per RTCA DO-260B' },
  { field: 'Subtype', bits: '3', type: 'uint', desc: 'Subtype for types 1-4, 20-22' },
  {
    field: 'Surveillance Status',
    bits: '3',
    type: 'enum',
    desc: '0=none, 1=permanent alert, 2=temp alert, 3=reserved, 4=SPI, 5=emergency',
  },
  {
    field: 'Altitude',
    bits: '12',
    type: 'int',
    desc: 'Barometric altitude in 25ft increments (−1000 to +101,325 ft)',
  },
  { field: 'Time', bits: '1', type: 'bool', desc: 'Time sync flag (1 = UTC coupled)' },
  {
    field: 'CPR Format',
    bits: '1',
    type: 'bool',
    desc: '0=even frame, 1=odd frame (for position decoding)',
  },
  {
    field: 'Encoded Lat',
    bits: '17',
    type: 'int',
    desc: 'CPR encoded latitude (requires even+odd pair to decode)',
  },
  { field: 'Encoded Lon', bits: '17', type: 'int', desc: 'CPR encoded longitude' },
  {
    field: 'NIC',
    bits: '4',
    type: 'uint',
    desc: 'Navigation Integrity Category (0-11, containment radius)',
  },
  {
    field: 'Speed',
    bits: '10',
    type: 'uint',
    desc: 'Ground speed in knots (0-1022, 1023=unavailable)',
  },
  {
    field: 'Heading',
    bits: '10',
    type: 'uint',
    desc: 'True track angle 0-359° (1023=unavailable)',
  },
  {
    field: 'Vertical Rate',
    bits: '9',
    type: 'int',
    desc: 'Rate of climb/descent in 64 ft/min (−16,256 to +16,256)',
  },
];

export default function LearnADSB() {
  return (
    <>
      {/* Introduction */}
      <DocumentationBlock
        id="introduction"
        title="ADS-B Protocol & Visualization"
        subtitle="Understanding Automatic Dependent Surveillance-Broadcast — the primary data source for aviation domain awareness"
        level={1}
        badges={[
          { label: 'msg/min', value: '128.7K', color: 'primary' },
          { label: 'active tracks', value: '8.4K', color: 'success' },
          { label: 'sources', value: '412', color: 'info' },
        ]}
      >
        <DocParagraph>
          Automatic Dependent Surveillance-Broadcast (ADS-B) is a surveillance technology where
          aircraft determine their position via satellite navigation and periodically broadcast it,
          enabling them to be tracked. Unlike primary radar, ADS-B is "dependent" on the aircraft's
          own navigation system and "broadcast" without interrogation.
        </DocParagraph>
        <DocParagraph>
          HormuzWatch ingests ADS-B from the OpenSky Network, direct SDR receivers, and commercial
          aggregators — achieving <strong>128,700+ messages per minute</strong> over the Middle East
          airspace including the Tehran, Dubai, and Muscat FIRs.
        </DocParagraph>
        <DocCallout type="info" title="1090 MHz Extended Squitter">
          ADS-B operates on 1090 MHz (Mode S Extended Squitter) with 1 Mbps data rate. Each message
          is 112 µs. Range is 150-250 NM at altitude, line-of-sight. UAT (978 MHz) is used in US
          general aviation below 18,000 ft.
        </DocCallout>
      </DocumentationBlock>

      {/* Live ADS-B Stream */}
      <Section
        id="live-stream"
        title="Live ADS-B Stream"
        subtitle="Real-time aircraft positions across the region"
        className="mb-4"
      >
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden glass-card border border-border/50">
          <EditorialMap
            region="aviation"
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
              <span className="font-data text-data-sm text-primary">LIVE ADS-B</span>
            </div>
          </div>
        </div>
        <MetricGrid metrics={AVIATION_METRICS} columns={4} className="mt-4" />
      </Section>

      {/* Message Format */}
      <DocumentationBlock
        id="message-format"
        title="ADS-B Message Format"
        subtitle="112-bit Mode S Extended Squitter structure per RTCA DO-260B"
        badges={[{ label: 'message types', value: '28', color: 'primary' }]}
      >
        <DocParagraph>
          ADS-B messages are 112-bit Mode S Extended Squitter transmissions. The first 56 bits are
          the Mode S header (DF=17/18 for ADS-B, CA=transponder capability, ICAO24=aircraft address,
          PI=parity/interrogator ID). The remaining 56 bits contain the ADS-B payload defined by the
          Type Code.
        </DocParagraph>
        <DocCodeBlock
          language="text"
          filename="adsb_message_structure.txt"
          code={`┌─────────────────────────────────────────────────────────────────┐
│                    112-bit ADS-B Extended Squitter              │
├─────────────────────────────────────────────────────────────────┤
│  DF (5) │ CA (3) │  ICAO24 (24)  │     Payload (56)      │ PI  │
│  17/18  │   5    │  24-bit addr  │  Type Code + Data     │ 24  │
└─────────────────────────────────────────────────────────────────┘
  5 bits    3 bits      24 bits           56 bits            24 bits
  
  DF = Downlink Format (17=ADS-B, 18=ADS-B with surface format)
  CA = Transponder Capability
  ICAO24 = 24-bit Aircraft Address (unique per airframe)
  PI = Parity/Interrogator Identity (CRC + II code)`}
        />
      </DocumentationBlock>

      {/* Message Types */}
      <DocumentationBlock
        id="message-types"
        title="ADS-B Message Types"
        subtitle="Type Code 1-28 per RTCA DO-260B / ICAO Doc 9871"
      >
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-background-elevated/50">
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Type Code
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-fg-muted uppercase tracking-wider hidden md:table-cell">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {adsbMessageTypes.map((mt) => (
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
        title="Airborne Position Field Structure (Type 1-4)"
        subtitle="Bit-level breakdown of the 56-bit ADS-B payload"
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
              {adsbFields.map((f) => (
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
                        f.type === 'enum' && 'bg-warning/10 text-warning',
                        f.type === 'hex' && 'bg-purple/10 text-purple'
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

      {/* CPR Position Decoding */}
      <DocumentationBlock
        id="cpr-decoding"
        title="CPR Position Decoding"
        subtitle="Compact Position Reporting — how to decode lat/lon from even/odd frame pairs"
      >
        <DocParagraph>
          ADS-B position uses Compact Position Reporting (CPR) to encode latitude/longitude in 34
          bits (17+17). Two frames (one even, one odd) received within ~10 seconds are required to
          decode an unambiguous position.
        </DocParagraph>
        <DocCallout type="info" title="CPR Algorithm">
          The algorithm uses the fact that the earth is divided into zones. The even frame defines
          one zone, the odd frame defines an adjacent zone. The intersection of the two zones gives
          the position.
          <br />
          <strong>Key parameters:</strong> Even/odd frame flag (bit 54), encoded latitude (17 bits),
          encoded longitude (17 bits).
          <br />
          <strong>Resolution:</strong> ~5.6 NM at equator for 17-bit encoding.
        </DocCallout>
        <DocCodeBlock
          language="python"
          filename="cpr_decode.py"
          code={`def cpr_decode(even_lat, even_lon, odd_lat, odd_lon, even_frame=True):
    """Decode ADS-B CPR position (simplified). Returns (lat, lon) in degrees."""
    NZ = 15  # Number of latitude zones (fixed for 17-bit)
    
    # Zone sizes
    dlat_even = 360.0 / (4 * NZ)
    dlat_odd  = 360.0 / (4 * NZ - 1)
    
    # Zone indices
    j = math.floor((59 * even_lat - 60 * odd_lat) / 131072 + 0.5)
    
    # Latitude
    if even_frame:
        lat = dlat_even * (j % 60 + even_lat / 131072)
    else:
        lat = dlat_odd * (j % 59 + odd_lat / 131072)
    
    # Longitude (depends on latitude zone)
    nz = math.floor(lat / dlat_even) if even_frame else math.floor(lat / dlat_odd)
    dlon = 360.0 / max(1, NZ - nz) if even_frame else 360.0 / max(1, NZ - nz - 1)
    
    m = math.floor((dlon * even_lon - dlon * odd_lon) / 131072 + 0.5)
    lon = dlon * (m + even_lon / 131072)
    
    return lat, lon`}
        />
      </DocumentationBlock>

      {/* Emergency / Squawk Codes */}
      <DocumentationBlock
        id="emergency-codes"
        title="Emergency & Priority Codes"
        subtitle="Type 28 (Aircraft Status) emergency/priority state encoding"
      >
        <DocCallout type="danger" title="Emergency Squawk Codes">
          When an aircraft transmits Type 28 with emergency state set, it indicates one of:
        </DocCallout>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              code: '7700',
              label: 'General Emergency',
              desc: 'Aircraft has a general emergency (engine failure, medical, etc.)',
            },
            { code: '7600', label: 'Radio Failure', desc: 'Loss of two-way radio communication' },
            {
              code: '7500',
              label: 'Unlawful Interference',
              desc: 'Hijacking or unlawful interference',
            },
          ].map((card) => (
            <div
              key={card.code}
              className="glass-card rounded-xl p-4 border border-danger/20 bg-danger/5"
            >
              <h4 className="font-display text-heading-sm text-danger mb-2">Squawk {card.code}</h4>
              <p className="font-ui font-medium text-fg mb-1">{card.label}</p>
              <p className="font-ui text-body-sm text-fg-muted">{card.desc}</p>
            </div>
          ))}
        </div>
      </DocumentationBlock>

      {/* API */}
      <DocumentationBlock
        id="api"
        title="ADS-B API Reference"
        subtitle="Query aircraft data and real-time ADS-B streams"
      >
        <div className="space-y-6">
          <APIExampleBlock
            method="GET"
            endpoint="/api/v1/aircraft"
            description="List active aircraft with optional region and altitude filters."
            params={[
              {
                name: 'region',
                type: 'string',
                description: 'Filter by FIR/region',
                example: 'tehran',
              },
              {
                name: 'min_alt',
                type: 'number',
                description: 'Minimum altitude (ft)',
                example: '20000',
              },
              {
                name: 'max_alt',
                type: 'number',
                description: 'Maximum altitude (ft)',
                example: '45000',
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
  "https://api.hormuzwatch.com/api/v1/aircraft?region=tehran&min_alt=20000&limit=50"`,
              },
              {
                lang: 'js',
                code: `const res = await fetch('/api/v1/aircraft?region=tehran', {
  headers: { Authorization: \`Bearer \${token}\` }
});
const { aircraft } = await res.json();`,
              },
              {
                lang: 'python',
                code: `import requests
aircraft = requests.get(
  'https://api.hormuzwatch.com/api/v1/aircraft',
  headers={'Authorization': f'Bearer {token}'},
  params={'region': 'tehran', 'limit': 50}
).json()['aircraft']`,
              },
            ]}
            sampleResponse={`{
  "aircraft": [
    {
      "icao24": "738452",
      "callsign": "UAE123 ",
      "origin_country": "AE",
      "time_position": 1721456789,
      "last_contact": 1721456791,
      "longitude": 52.41,
      "latitude": 25.12,
      "baro_altitude": 35000,
      "velocity": 482,
      "true_track": 274.5,
      "vertical_rate": 0,
      "sensors": [1, 3, 5],
      "geo_altitude": 35100,
      "squawk": "2145",
      "spi": false,
      "position_source": 0
    }
  ],
  "total": 842,
  "region": "tehran"
}`}
          />

          <APIExampleBlock
            method="WS"
            endpoint="/ws/adsb"
            description="Real-time ADS-B position stream. Subscribe to all aircraft or filter by region/altitude."
            examples={[
              {
                lang: 'js',
                code: `const ws = new WebSocket('wss://api.hormuzwatch.com/ws/adsb');

ws.onopen = () => {
  ws.send(JSON.stringify({ 
    action: 'subscribe', 
    region: 'tehran',
    min_alt: 20000,
    max_alt: 50000
  }));
};

ws.onmessage = (e) => {
  const { type, data } = JSON.parse(e.data);
  if (type === 'telemetry') {
    console.log(data.callsign, data.latitude, data.longitude, data.baro_altitude);
  }
};`,
              },
              {
                lang: 'python',
                code: `import asyncio, json, websockets

async def stream_adsb():
    uri = "wss://api.hormuzwatch.com/ws/adsb"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({
          "action": "subscribe", 
          "region": "tehran"
        }))
        async for msg in ws:
            data = json.loads(msg)
            print(f"{data['data']['callsign']} @ {data['data']['baro_altitude']}ft")

asyncio.run(stream_adsb())`,
              },
            ]}
            sampleResponse={`// Streaming message (arrives every ~1-2s per aircraft)
{
  "type": "telemetry",
  "data": {
    "icao24": "738452",
    "callsign": "UAE123 ",
    "latitude": 25.12,
    "longitude": 52.41,
    "baro_altitude": 35000,
    "velocity": 482,
    "true_track": 274.5,
    "vertical_rate": 0,
    "squawk": "2145",
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
              label: 'RTCA DO-260B',
              desc: 'Minimum Operational Performance Standards for 1090 MHz Extended Squitter ADS-B',
              url: 'https://www.rtca.org/',
            },
            {
              label: 'ICAO Doc 9871',
              desc: 'Technical Provisions for Mode S Services and Extended Squitter',
              url: 'https://www.icao.int/',
            },
            {
              label: 'OpenSky Network',
              desc: 'Open ADS-B receiver network with historical and real-time API',
              url: 'https://opensky-network.org/',
            },
            {
              label: 'Mode S Protocol',
              desc: 'ICAO Annex 10 Vol IV - Mode S Air Ground Data Link',
              url: 'https://www.icao.int/',
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
