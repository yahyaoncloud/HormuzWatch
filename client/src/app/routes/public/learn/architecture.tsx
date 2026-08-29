import { Link } from 'react-router';
import { Section } from '@/components/layout/Section';
import { LivePlatformMetrics } from '@/components/data/MetricGrid';

const architectureLayers = [
  {
    layer: 'Presentation Layer',
    components: [
      'React 19',
      'React Router v7',
      'TypeScript',
      'Tailwind CSS 4',
      'MapLibre GL',
      'Three.js',
    ],
    color: 'primary',
    description: 'Client-side SPA with framework-mode SSR for SEO. Maps are WebGL-accelerated.',
  },
  {
    layer: 'Real-time Layer',
    components: [
      'WebSocket Gateway',
      'Server-Sent Events',
      'Message Router',
      'Reconnection Manager',
    ],
    color: 'info',
    description:
      'Multiplexed WebSocket connection streams AIS, ADS-B, anomalies, alerts, and metrics.',
  },
  {
    layer: 'API Gateway',
    components: ['REST API v1', 'GraphQL (Phase 2)', 'Rate Limiting', 'Auth (JWT)', 'OpenAPI'],
    color: 'success',
    description:
      'REST endpoints for historical queries, region data, and configuration. 99.99% uptime.',
  },
  {
    layer: 'Processing Layer',
    components: ['Go Microservices', 'Kafka', 'Track Fusion', 'Behavioral Scoring', 'ML Ensemble'],
    color: 'warning',
    description: 'High-performance Go services process 173k+ messages/min with sub-second latency.',
  },
  {
    layer: 'Data Layer',
    components: ['ClickHouse', 'PostgreSQL', 'Redis', 'S3', 'Vector Tiles'],
    color: 'danger',
    description:
      'Time-series storage for 90-day history, relational for metadata, object for satellite tiles.',
  },
  {
    layer: 'Ingestion Layer',
    components: ['AIS Satellites', 'Terrestrial AIS', 'ADS-B Receivers', 'Radar', 'OSINT Feeds'],
    color: 'primary',
    description:
      'Multi-source data ingestion from satellite, terrestrial, and open-source intelligence.',
  },
];

export default function LearnArchitecture() {
  return (
    <>
      <Section
        id="introduction"
        title="Platform Architecture"
        subtitle="A scalable, real-time intelligence platform built for operational use"
        className="mb-4"
      >
        <div className="prose-body max-w-4xl">
          <p className="text-body-lg text-fg/90">
            HormuzWatch is built as a <strong>modular monolith frontend</strong> with
            <strong>microservices backend</strong>. The frontend is a React 19 SPA using React
            Router v7 framework mode, while the backend comprises Go microservices communicating via
            Kafka.
          </p>
          <p className="mt-4">
            This page documents the complete architecture. As you scroll, you'll see live system
            metrics from the running platform alongside each architectural component.
          </p>
        </div>
      </Section>

      {/* Live System Status */}
      <Section
        id="status"
        title="Live System Status"
        subtitle="Current platform health"
        className="mb-4"
      >
        <LivePlatformMetrics columns={4} />
      </Section>

      {/* Architecture Layers */}
      <Section
        id="layers"
        title="Architecture Layers"
        subtitle="Six layers from ingestion to presentation"
        className="mb-4"
      >
        <div className="space-y-4">
          {architectureLayers.map((layer) => (
            <article
              key={layer.layer}
              className="glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-48 lg:shrink-0">
                  <h3 className="font-display text-heading-md text-fg mb-2">{layer.layer}</h3>
                  <div className="flex flex-wrap gap-2">
                    {layer.components.map((comp) => (
                      <span
                        key={comp}
                        className="px-2 py-1 bg-background-elevated border border-border/50 rounded text-caption text-fg-muted"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex items-center">
                  <p className="font-ui text-body text-fg-muted">{layer.description}</p>
                </div>
                <div className="lg:w-12 lg:shrink-0 flex items-center justify-center">
                  <div
                    className="w-4 h-16 rounded-full"
                    style={{ backgroundColor: `var(--color-${layer.color})`, opacity: 0.3 }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Component Diagram */}
      <Section
        id="diagram"
        title="System Diagram"
        subtitle="High-level component interaction"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <div className="aspect-[16/9] bg-background-elevated/30 rounded-lg border border-border/50 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 900 500"
              className="w-full h-full"
              role="img"
              aria-label="System architecture diagram"
            >
              <title>
                System architecture diagram showing data flow from sources through Kafka,
                processing, ML inference, to API and frontend
              </title>
              {/* Data sources */}
              <rect
                x="20"
                y="50"
                width="120"
                height="80"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <text
                x="80"
                y="95"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="12"
                fontFamily="var(--font-ui)"
              >
                AIS Sources
              </text>

              <rect
                x="20"
                y="160"
                width="120"
                height="80"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-info)"
                strokeWidth="2"
              />
              <text
                x="80"
                y="205"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="12"
                fontFamily="var(--font-ui)"
              >
                ADS-B
              </text>

              <rect
                x="20"
                y="270"
                width="120"
                height="80"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-success)"
                strokeWidth="2"
              />
              <text
                x="80"
                y="315"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="12"
                fontFamily="var(--font-ui)"
              >
                Radar/SAT
              </text>

              {/* Kafka */}
              <rect
                x="190"
                y="170"
                width="130"
                height="80"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-warning)"
                strokeWidth="2"
              />
              <text
                x="255"
                y="215"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="13"
                fontFamily="var(--font-ui)"
              >
                Kafka
              </text>

              {/* Processing */}
              <rect
                x="370"
                y="170"
                width="140"
                height="80"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <text
                x="440"
                y="215"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="12"
                fontFamily="var(--font-ui)"
              >
                Go Services
              </text>

              {/* Databases */}
              <rect
                x="550"
                y="50"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-danger)"
                strokeWidth="2"
              />
              <text
                x="610"
                y="85"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                ClickHouse
              </text>

              <rect
                x="550"
                y="140"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-danger)"
                strokeWidth="2"
              />
              <text
                x="610"
                y="175"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                PostgreSQL
              </text>

              <rect
                x="550"
                y="230"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-danger)"
                strokeWidth="2"
              />
              <text
                x="610"
                y="265"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                Redis
              </text>

              {/* API */}
              <rect
                x="550"
                y="340"
                width="120"
                height="80"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-success)"
                strokeWidth="2"
              />
              <text
                x="610"
                y="385"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="12"
                fontFamily="var(--font-ui)"
              >
                REST API
              </text>

              {/* WebSocket */}
              <rect
                x="550"
                y="450"
                width="120"
                height="40"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-info)"
                strokeWidth="2"
              />
              <text
                x="610"
                y="475"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                WebSocket
              </text>

              {/* Frontend */}
              <rect
                x="730"
                y="170"
                width="140"
                height="120"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <text
                x="800"
                y="235"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="13"
                fontFamily="var(--font-ui)"
              >
                React SPA
              </text>

              {/* Arrows */}
              {[
                [140, 90, 190, 195],
                [140, 200, 190, 210],
                [140, 310, 190, 220],
                [320, 210, 370, 210],
                [510, 210, 550, 210],
                [510, 230, 550, 160],
                [510, 250, 550, 250],
                [510, 270, 550, 360],
                [510, 290, 550, 470],
                [670, 230, 730, 230],
                [670, 380, 800, 280],
                [670, 470, 800, 280],
              ].map((arrow) => {
                const [x1, y1, x2, y2] = arrow;
                return (
                  <line
                    key={`${x1}-${y1}-${x2}-${y2}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--color-primary)"
                    strokeWidth="1.5"
                    opacity="0.5"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}

              <defs>
                <marker
                  id="arrowhead"
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
            </svg>
          </div>
        </div>
      </Section>

      {/* Tech Stack */}
      <Section
        id="tech-stack"
        title="Technology Stack"
        subtitle="Production-grade, battle-tested tools"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              category: 'Frontend',
              items: ['React 19', 'RR7', 'TypeScript 5.5', 'Tailwind 4', 'MapLibre GL', 'Three.js'],
              color: 'primary',
            },
            {
              category: 'State',
              items: ['Zustand', 'TanStack Query', 'WebSocket', 'Immer'],
              color: 'info',
            },
            {
              category: 'Backend',
              items: ['Go 1.22', 'Kafka', 'gRPC', 'PostgreSQL', 'ClickHouse'],
              color: 'success',
            },
            {
              category: 'Infra',
              items: ['Docker', 'Kubernetes', 'Terraform', 'Azure', 'Prometheus'],
              color: 'warning',
            },
          ].map((stack) => (
            <div key={stack.category} className="glass-card rounded-xl p-6 border border-border/50">
              <h4
                className="font-display text-heading-sm text-fg mb-3"
                style={{ color: `var(--color-${stack.color})` }}
              >
                {stack.category}
              </h4>
              <ul className="space-y-2">
                {stack.items.map((item) => (
                  <li key={item} className="font-ui text-body-sm text-fg-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Deployment */}
      <Section
        id="deployment"
        title="Deployment"
        subtitle="From local dev to production scale"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Local Development',
              desc: 'Docker Compose with hot reload',
              time: '< 5 min',
              href: '/deploy/docker',
            },
            {
              title: 'Production',
              desc: 'Optimized build with CDN',
              time: '< 15 min',
              href: '/deploy/docker',
            },
            {
              title: 'Kubernetes',
              desc: 'Helm charts for K8s clusters',
              time: '< 30 min',
              href: '/deploy/kubernetes',
            },
          ].map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className="glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 hover:border-[var(--color-primary-300)] transition-all group"
            >
              <h4 className="font-display text-heading-sm text-fg mb-2 group-hover:text-primary transition-colors">
                {item.title}
              </h4>
              <p className="font-ui text-body-sm text-fg-muted mb-4">{item.desc}</p>
              <div className="flex items-center justify-between">
                <span className="font-data text-data-sm text-success">{item.time}</span>
                <svg
                  className="w-5 h-5 text-fg-muted group-hover:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>View milestone details</title>
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
    </>
  );
}
