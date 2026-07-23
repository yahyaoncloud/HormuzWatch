import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { MetricGrid, PLATFORM_METRICS } from '@/components/data/MetricGrid';
import { cn } from '@/utils/cn';

type APISectionId = 'v1' | 'ws' | 'examples';

interface APISection {
  id: APISectionId;
  title: string;
  description: string;
  href: string;
  color: string;
  examples: number;
}

const apiSections: APISection[] = [
  {
    id: 'v1',
    title: 'REST API v1',
    description:
      'Query vessels, aircraft, anomalies, incidents, regions, and metrics. Full OpenAPI 3.1 schema.',
    href: '/api/v1',
    color: 'primary',
    examples: 24,
  },
  {
    id: 'ws',
    title: 'WebSocket API',
    description:
      'Real-time streams for AIS, ADS-B, anomalies, alerts, incidents, and platform metrics.',
    href: '/api/ws',
    color: 'info',
    examples: 6,
  },
  {
    id: 'examples',
    title: 'Live Examples',
    description: 'Interactive API explorer with live data, code samples in multiple languages.',
    href: '/api/examples',
    color: 'success',
    examples: 12,
  },
];

export default function APIIndex() {
  const [selectedSection, setSelectedSection] = useState<APISectionId>('v1');
  const [codeSample, setCodeSample] = useState<string>('');

  const samples = useMemo(
    () => ({
      v1: `// Get public conflict intelligence feed
const response = await fetch('https://hormuzwatchapi.aburcloud.com/public/conflicts');
const { conflicts } = await response.json();
console.log(\`Found \${conflicts.length} active conflicts\`);`,
      ws: `// Connect to real-time telemetry via WebSocket
const ws = new WebSocket('wss://hormuzwatchapi.aburcloud.com/ws/stream');
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'telemetry') {
    console.log('Track:', msg.data.trackId, 'at', msg.data.lat, msg.data.lon);
  }
};`,
      examples: `# Python: Fetch top anomalous traces
import requests

resp = requests.get(
    'https://hormuzwatchapi.aburcloud.com/public/top-traces',
    headers={'Accept': 'application/json'}
)
traces = resp.json()['traces']
for t in traces[:3]:
    print(f"{t['assetName']} — score: {t['score']:.1f}")`,
    }),
    []
  );

  useEffect(() => {
    setCodeSample(samples[selectedSection] || '');
  }, [selectedSection, samples]);

  return (
    <PageContainer>
      {/* Hero */}
      <Section
        id="introduction"
        title="API Reference"
        subtitle="Integrate HormuzWatch intelligence into your systems"
        className="mb-4"
      >
        <div className="prose-body max-w-4xl">
          <p className="text-body-lg text-[var(--color-fg)]/90">
            HormuzWatch provides both <strong>REST</strong> and <strong>WebSocket</strong> APIs for
            accessing real-time and historical intelligence across the Gulf region. Most public
            endpoints are accessible without authentication; admin endpoints require JWT.
          </p>
          <p className="mt-4 font-ui text-sm text-[var(--color-fg-muted)]">
            Base URL:{' '}
            <code className="font-data text-xs bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded">
              https://hormuzwatchapi.aburcloud.com
            </code>
          </p>
        </div>
      </Section>

      {/* Live API Status */}
      <Section id="status" title="API Status" subtitle="Current endpoint health" className="mb-4">
        <MetricGrid metrics={PLATFORM_METRICS} columns={4} />
      </Section>

      {/* API Sections */}
      <Section
        id="sections"
        title="API Sections"
        subtitle="Choose your integration path"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apiSections.map((section) => (
            <Link
              key={section.id}
              to={section.href}
              className={cn(
                'glass-card rounded-xl p-6 hover:border-[var(--color-primary-300)] transition-all group',
                selectedSection === section.id &&
                  'border-[var(--color-primary-600)]/50 bg-[var(--color-primary-50)]'
              )}
              onClick={() => setSelectedSection(section.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-display text-heading-sm text-[var(--color-fg)] group-hover:text-[var(--color-primary-600)] transition-colors">
                  {section.title}
                </h3>
                <span
                  className="font-data text-data-sm"
                  style={{ color: `var(--color-${section.color})` }}
                >
                  {section.examples}
                </span>
              </div>
              <p className="font-ui text-body-sm text-[var(--color-fg-muted)] mb-4">
                {section.description}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                <span className="font-ui text-caption text-[var(--color-fg-muted)]">View →</span>
                <svg
                  className="w-5 h-5 text-[var(--color-fg-muted)] group-hover:text-[var(--color-primary-600)] transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>View section details</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Interactive Code Sample */}
      <Section
        id="code"
        title="Quick Start Code"
        subtitle="Copy-paste examples for common integrations"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6">
          <div className="flex gap-2 mb-4">
            {apiSections.map((section) => (
              <button
                type="button"
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={cn(
                  'px-4 py-2 rounded-lg font-ui font-medium text-body-sm transition-colors',
                  selectedSection === section.id
                    ? 'bg-[var(--color-primary-600)] text-white'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)]'
                )}
              >
                {section.title}
              </button>
            ))}
          </div>
          <pre className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg p-4 overflow-x-auto text-sm font-data">
            <code>{codeSample}</code>
          </pre>
        </div>
      </Section>

      {/* Endpoints Quick Reference */}
      <Section
        id="endpoints"
        title="Key Endpoints"
        subtitle="Most-used API routes"
        className="mb-4"
      >
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                <th className="px-4 py-3 text-left font-ui text-caption text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Method
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left font-ui text-caption text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  method: 'GET',
                  endpoint: '/public/conflicts',
                  desc: 'Live Gulf conflict intelligence feed (22+ sources)',
                },
                {
                  method: 'GET',
                  endpoint: '/public/top-traces',
                  desc: 'Top anomalous vessel/aircraft traces by score',
                },
                {
                  method: 'GET',
                  endpoint: '/public/metrics',
                  desc: 'Platform-wide telemetry and anomaly metrics',
                },
                {
                  method: 'GET',
                  endpoint: '/public/briefing',
                  desc: 'AI-generated situational intelligence briefing',
                },
                {
                  method: 'GET',
                  endpoint: '/public/news',
                  desc: 'Aggregated RSS news feeds from Gulf region',
                },
                {
                  method: 'GET',
                  endpoint: '/public/heatmap',
                  desc: 'Anomaly density heatmap tiles (GeoJSON)',
                },
                {
                  method: 'WS',
                  endpoint: '/ws/stream',
                  desc: 'Real-time AIS/ADS-B telemetry + anomaly stream',
                },
                {
                  method: 'GET',
                  endpoint: '/public/history/attacks',
                  desc: 'Historical attack database for Gulf region',
                },
              ].map((row) => (
                <tr
                  key={row.endpoint}
                  className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-bg-elevated)]"
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-caption font-data font-bold',
                        row.method === 'GET' &&
                          'bg-[var(--color-success)]/20 text-[var(--color-success)]',
                        row.method === 'POST' &&
                          'bg-[var(--color-warning)]/20 text-[var(--color-warning)]',
                        row.method === 'WS' && 'bg-[var(--color-info)]/20 text-[var(--color-info)]'
                      )}
                    >
                      {row.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-data text-data-sm text-[var(--color-fg)]">
                    {row.endpoint}
                  </td>
                  <td className="px-4 py-3 font-ui text-body-sm text-[var(--color-fg-muted)]">
                    {row.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SDKs */}
      <Section
        id="sdks"
        title="Client Libraries"
        subtitle="Official SDKs for popular languages"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              lang: 'JavaScript/TypeScript',
              install: 'npm install @hormuzwatch/sdk',
              color: 'primary',
            },
            { lang: 'Python', install: 'pip install hormuzwatch', color: 'info' },
            { lang: 'Go', install: 'go get github.com/hormuzwatch/sdk-go', color: 'success' },
          ].map((sdk) => (
            <div key={sdk.lang} className="glass-card rounded-xl p-5">
              <h4 className="font-display text-heading-sm text-[var(--color-fg)] mb-3">
                {sdk.lang}
              </h4>
              <code className="font-data text-xs bg-[var(--color-bg-elevated)] px-3 py-2 rounded block text-[var(--color-fg)]">
                {sdk.install}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* Rate Limits */}
      <Section
        id="rate-limits"
        title="Rate Limits & Quotas"
        subtitle="Fair-use policies for API access"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <h4 className="font-display text-heading-sm text-[var(--color-fg)] mb-4">REST API</h4>
            <ul className="space-y-3 font-ui text-body text-[var(--color-fg-muted)]">
              <li className="flex justify-between">
                <span>Free tier</span>
                <span className="font-data text-data-sm text-[var(--color-warning)]">
                  1,000/min
                </span>
              </li>
              <li className="flex justify-between">
                <span>Pro tier</span>
                <span className="font-data text-data-sm text-[var(--color-primary-600)]">
                  10,000/min
                </span>
              </li>
              <li className="flex justify-between">
                <span>Enterprise</span>
                <span className="font-data text-data-sm text-[var(--color-success)]">Custom</span>
              </li>
              <li className="flex justify-between">
                <span>Burst allowance</span>
                <span className="font-data text-data-sm text-[var(--color-info)]">2x for 10s</span>
              </li>
            </ul>
          </div>
          <div className="glass-card rounded-xl p-6">
            <h4 className="font-display text-heading-sm text-[var(--color-fg)] mb-4">WebSocket</h4>
            <ul className="space-y-3 font-ui text-body text-[var(--color-fg-muted)]">
              <li className="flex justify-between">
                <span>Concurrent connections</span>
                <span className="font-data text-data-sm text-[var(--color-primary-600)]">10</span>
              </li>
              <li className="flex justify-between">
                <span>Message rate</span>
                <span className="font-data text-data-sm text-[var(--color-info)]">Unlimited</span>
              </li>
              <li className="flex justify-between">
                <span>Reconnect backoff</span>
                <span className="font-data text-data-sm text-[var(--color-warning)]">
                  Exponential
                </span>
              </li>
              <li className="flex justify-between">
                <span>Heartbeat</span>
                <span className="font-data text-data-sm text-[var(--color-success)]">30s</span>
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
}
