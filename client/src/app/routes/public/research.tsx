import { Link } from 'react-router';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { LivePlatformMetrics } from '@/components/data/MetricGrid';
import { cn } from '@/utils/cn';

const researchCategories = [
  {
    id: 'papers',
    title: 'Academic Papers',
    description:
      'Peer-reviewed research on maritime anomaly detection, behavioral modeling, and geospatial intelligence.',
    href: '/research/papers',
    color: 'primary',
    count: 24,
  },
  {
    id: 'reports',
    title: 'Intelligence Reports',
    description:
      'Periodic assessments of regional maritime security, chokepoint risk, and threat landscapes.',
    href: '/research/reports',
    color: 'info',
    count: 12,
  },
  {
    id: 'methodology',
    title: 'Methodology Documents',
    description:
      'Technical specifications for detection algorithms, scoring models, and data pipeline architecture.',
    href: '/research/methodology',
    color: 'success',
    count: 8,
  },
];

export default function ResearchIndex() {
  return (
    <PageContainer>
      <Section
        id="introduction"
        title="Research & Publications"
        subtitle="Scientific foundation of HormuzWatch intelligence"
        className="mb-4"
      >
        <div className="prose-body max-w-4xl">
          <p className="text-body-lg text-fg/90">
            HormuzWatch is built on peer-reviewed research in maritime domain awareness, anomaly
            detection, and geospatial intelligence. This portal publishes our methods, validates our
            approaches, and contributes to the open research community.
          </p>
        </div>
      </Section>

      <Section
        id="status"
        title="Research Impact"
        subtitle="Quantified academic contribution"
        className="mb-4"
      >
        <LivePlatformMetrics columns={4} />
      </Section>

      <Section
        id="categories"
        title="Research Categories"
        subtitle="Browse by document type"
        className="mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {researchCategories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.href}
              className={cn(
                'glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 hover:border-[var(--color-primary-300)] transition-all group'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-display text-heading-sm text-fg group-hover:text-primary transition-colors">
                  {cat.title}
                </h3>
                <span
                  className="font-data text-data-sm"
                  style={{ color: `var(--color-${cat.color})` }}
                >
                  {cat.count}
                </span>
              </div>
              <p className="font-ui text-body-sm text-fg-muted mb-4">{cat.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <span className="font-ui text-caption text-fg-muted">Browse →</span>
                <svg
                  className="w-5 h-5 text-fg-muted group-hover:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
        id="featured"
        title="Featured Publications"
        subtitle="Stay tuned for published research"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6 border border-border/50 text-center">
          <p className="font-ui text-body text-fg-muted">
            Featured research publications coming soon.
          </p>
        </div>
      </Section>

      <Section
        id="submit"
        title="Submit Research"
        subtitle="Contribute to the knowledge base"
        className="mb-4"
      >
        <div className="glass-card rounded-xl p-6 border border-border/50 text-center">
          <h3 className="font-display text-heading-md text-fg mb-2">Have relevant research?</h3>
          <p className="font-ui text-body text-fg-muted mb-4 max-w-2xl mx-auto">
            We welcome submissions from academic researchers, government analysts, and industry
            practitioners. All submissions are peer-reviewed before publication.
          </p>
          <a
            href="mailto:research@hormuzwatch.com"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-ui font-medium text-body hover:bg-primary/90 transition-colors"
          >
            Submit Your Work
          </a>
        </div>
      </Section>
    </PageContainer>
  );
}
