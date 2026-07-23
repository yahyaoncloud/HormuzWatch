import { Link } from 'react-router';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { MetricGrid, PLATFORM_METRICS } from '@/components/data/MetricGrid';
import { cn } from '@/utils/cn';

const deployOptions = [
  {
    id: 'docker',
    title: 'Docker Compose',
    description: 'Single-command deployment for development and small production environments.',
    href: '/deploy/docker',
    color: 'primary',
    time: '< 5 min',
    complexity: 'Beginner',
  },
  {
    id: 'kubernetes',
    title: 'Kubernetes',
    description: 'Helm charts for production-grade clusters with autoscaling and HA.',
    href: '/deploy/kubernetes',
    color: 'info',
    time: '< 30 min',
    complexity: 'Advanced',
  },
  {
    id: 'azure',
    title: 'Azure Infrastructure',
    description: 'Terraform modules for AKS, PostgreSQL, Redis, and CDN deployment.',
    href: '/deploy/azure',
    color: 'success',
    time: '< 45 min',
    complexity: 'Advanced',
  },
  {
    id: 'monitoring',
    title: 'Observability',
    description: 'Prometheus, Grafana, and OpenTelemetry for full-stack monitoring.',
    href: '/deploy/monitoring',
    color: 'warning',
    time: '< 15 min',
    complexity: 'Intermediate',
  },
];

export default function DeployIndex() {
  return (
    <PageContainer>
      <Section
        id="introduction"
        title="Deployment & Operations"
        subtitle="From local dev to global production"
        className="mb-4"
      >
        <div className="prose-body max-w-4xl">
          <p className="text-body-lg text-fg/90">
            HormuzWatch is designed for deployment flexibility — from a single Docker container to a
            multi-region Kubernetes cluster. All configurations are Infrastructure-as-Code,
            version-controlled, and tested in CI/CD.
          </p>
        </div>
      </Section>

      <Section
        id="status"
        title="Platform Health"
        subtitle="Current production metrics"
        className="mb-4"
      >
        <MetricGrid metrics={PLATFORM_METRICS} columns={4} />
      </Section>

      <Section
        id="options"
        title="Deployment Options"
        subtitle="Choose your infrastructure path"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deployOptions.map((option) => (
            <Link
              key={option.id}
              to={option.href}
              className={cn(
                'glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 hover:border-[var(--color-primary-300)] transition-all group'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-display text-heading-md text-fg group-hover:text-primary transition-colors">
                  {option.title}
                </h3>
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-caption font-medium',
                    option.complexity === 'Beginner' && 'bg-success/20 text-success',
                    option.complexity === 'Intermediate' && 'bg-info/20 text-info',
                    option.complexity === 'Advanced' && 'bg-warning/20 text-warning'
                  )}
                >
                  {option.complexity}
                </span>
              </div>
              <p className="font-ui text-body text-fg-muted mb-4">{option.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <span className="font-data text-data-sm text-success">{option.time}</span>
                <svg
                  className="w-5 h-5 text-fg-muted group-hover:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>Navigate to deployment option</title>
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

      <Section
        id="quick-start"
        title="Quick Start"
        subtitle="Get running in minutes"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6 border border-border/50 mb-6">
          <h4 className="font-display text-heading-md text-fg mb-4">
            Docker Compose (Recommended)
          </h4>
          <pre className="bg-background-elevated/50 border border-border/50 rounded-lg p-4 overflow-x-auto text-sm font-data">
            <code>{`# Clone repository
git clone https://github.com/hormuzwatch/platform.git
cd platform

# Start all services
docker-compose up -d

# Access at http://localhost:3000
# API docs at http://localhost:8080/docs`}</code>
          </pre>
        </div>
      </Section>

      <Section
        id="architecture"
        title="Deployment Architecture"
        subtitle="Production-grade multi-tier setup"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <div className="aspect-[16/9] bg-background-elevated/30 rounded-lg border border-border/50 flex items-center justify-center">
            <svg
              viewBox="0 0 800 400"
              className="w-full h-full"
              role="img"
              aria-label="Deployment architecture diagram"
            >
              <title>
                Deployment architecture diagram showing users, load balancer, API gateway, services,
                and databases
              </title>
              {/* Users */}
              <rect
                x="20"
                y="180"
                width="100"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <text
                x="70"
                y="215"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="12"
                fontFamily="var(--font-ui)"
              >
                Users
              </text>

              {/* CDN */}
              <rect
                x="160"
                y="180"
                width="100"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-info)"
                strokeWidth="2"
              />
              <text
                x="210"
                y="215"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="12"
                fontFamily="var(--font-ui)"
              >
                CDN
              </text>

              {/* Ingress */}
              <rect
                x="300"
                y="180"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-warning)"
                strokeWidth="2"
              />
              <text
                x="360"
                y="215"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                Ingress
              </text>

              {/* Frontend Pods */}
              <rect
                x="460"
                y="100"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <text
                x="520"
                y="135"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                Frontend x3
              </text>

              {/* API Pods */}
              <rect
                x="460"
                y="180"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-success)"
                strokeWidth="2"
              />
              <text
                x="520"
                y="215"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                API x5
              </text>

              {/* WS Pods */}
              <rect
                x="460"
                y="260"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-info)"
                strokeWidth="2"
              />
              <text
                x="520"
                y="295"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="11"
                fontFamily="var(--font-ui)"
              >
                WS x3
              </text>

              {/* Databases */}
              <rect
                x="620"
                y="100"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-danger)"
                strokeWidth="2"
              />
              <text
                x="680"
                y="135"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="10"
                fontFamily="var(--font-ui)"
              >
                PostgreSQL
              </text>

              <rect
                x="620"
                y="180"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-danger)"
                strokeWidth="2"
              />
              <text
                x="680"
                y="215"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="10"
                fontFamily="var(--font-ui)"
              >
                ClickHouse
              </text>

              <rect
                x="620"
                y="260"
                width="120"
                height="60"
                rx="8"
                fill="var(--color-background-elevated)"
                stroke="var(--color-danger)"
                strokeWidth="2"
              />
              <text
                x="680"
                y="295"
                textAnchor="middle"
                fill="var(--color-fg)"
                fontSize="10"
                fontFamily="var(--font-ui)"
              >
                Redis
              </text>

              {/* Arrows */}
              {[
                [120, 210, 160, 210],
                [260, 210, 300, 210],
                [420, 210, 460, 210],
                [420, 210, 460, 130],
                [420, 210, 460, 290],
                [580, 210, 620, 210],
                [580, 130, 620, 130],
                [580, 290, 620, 290],
                [520, 160, 520, 180],
                [520, 240, 520, 260],
              ].map((arrow) => (
                <line
                  key={`${arrow[0]}-${arrow[1]}-${arrow[2]}-${arrow[3]}`}
                  x1={arrow[0]}
                  y1={arrow[1]}
                  x2={arrow[2]}
                  y2={arrow[3]}
                  stroke="var(--color-primary)"
                  strokeWidth="1.5"
                  opacity="0.5"
                  markerEnd="url(#arrowhead)"
                />
              ))}

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

      <Section
        id="requirements"
        title="System Requirements"
        subtitle="Minimum specs for production"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              component: 'Frontend',
              min: '2 vCPU, 2GB RAM',
              rec: '4 vCPU, 4GB RAM',
              color: 'primary',
            },
            {
              component: 'API Server',
              min: '4 vCPU, 4GB RAM',
              rec: '8 vCPU, 8GB RAM',
              color: 'success',
            },
            {
              component: 'Database',
              min: '4 vCPU, 16GB RAM',
              rec: '8 vCPU, 32GB RAM',
              color: 'danger',
            },
          ].map((req) => (
            <div key={req.component} className="glass-card rounded-xl p-6 border border-border/50">
              <h4
                className="font-display text-heading-sm text-fg mb-4"
                style={{ color: `var(--color-${req.color})` }}
              >
                {req.component}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-body-sm text-fg-muted">Minimum</span>
                  <span className="font-data text-data-sm text-fg">{req.min}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-ui text-body-sm text-fg-muted">Recommended</span>
                  <span className="font-data text-data-sm text-success">{req.rec}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}
