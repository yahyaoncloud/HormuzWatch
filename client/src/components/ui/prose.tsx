import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

// ============================================================
// Prose — theme-consistent typography wrapper for MD content.
// Apply <Prose> around any block of text to get proper
// heading, paragraph, code, list, table, and link styling.
// ============================================================

interface ProseProps {
  children: ReactNode;
  className?: string;
  /** Override default max-width (none = full width) */
  maxWidth?: 'none' | 'sm' | 'md' | 'lg';
}

export function Prose({ children, className, maxWidth = 'md' }: ProseProps) {
  const maxW = {
    none: '',
    sm: 'max-w-prose-sm',
    md: 'max-w-prose',
    lg: 'max-w-prose-lg',
  }[maxWidth];

  return (
    <div className={cn('prose-hw', maxW, className)}>
      <style>{`
        .prose-hw h1 {
          font-family: var(--font-display, 'Share Tech', sans-serif);
          font-size: clamp(1.5rem, 3vw, 2.25rem);
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--color-fg);
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .prose-hw h1:first-child { margin-top: 0; }

        .prose-hw h2 {
          font-family: var(--font-display, 'Share Tech', sans-serif);
          font-size: clamp(1.25rem, 2.5vw, 1.5rem);
          font-weight: 650;
          line-height: 1.3;
          letter-spacing: -0.015em;
          color: var(--color-fg);
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--color-border);
        }
        .prose-hw h2:first-child { margin-top: 0; }

        .prose-hw h3 {
          font-family: var(--font-display, 'Share Tech', sans-serif);
          font-size: clamp(1.05rem, 2vw, 1.2rem);
          font-weight: 600;
          line-height: 1.35;
          color: var(--color-fg);
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .prose-hw h3:first-child { margin-top: 0; }

        .prose-hw h4 {
          font-family: var(--font-display, 'Share Tech', sans-serif);
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.4;
          color: var(--color-fg);
          margin-top: 1rem;
          margin-bottom: 0.375rem;
        }

        .prose-hw p {
          font-family: var(--font-ui, 'Inter', sans-serif);
          font-size: 0.875rem;
          line-height: 1.7;
          color: var(--color-fg);
          opacity: 0.9;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .prose-hw a {
          color: var(--color-primary-600);
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 2px;
          font-weight: 500;
          transition: color 120ms;
        }
        .prose-hw a:hover {
          color: var(--color-primary-500);
        }

        .prose-hw strong {
          font-weight: 650;
          color: var(--color-fg);
        }

        .prose-hw em {
          font-style: italic;
        }

        .prose-hw code {
          font-family: var(--font-data, 'JetBrains Mono', monospace);
          font-size: 0.8125rem;
          background: var(--color-bg-elevated);
          color: var(--color-primary-600);
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          border: 0.5px solid var(--color-border);
          white-space: nowrap;
        }

        .prose-hw pre {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          padding: 1rem;
          overflow-x: auto;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          font-size: 0.8125rem;
        }
        .prose-hw pre code {
          background: none;
          border: none;
          padding: 0;
          white-space: pre;
          color: var(--color-fg);
        }

        .prose-hw ul,
        .prose-hw ol {
          font-family: var(--font-ui, 'Inter', sans-serif);
          font-size: 0.875rem;
          line-height: 1.7;
          color: var(--color-fg);
          opacity: 0.9;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
        }
        .prose-hw ul { list-style-type: disc; }
        .prose-hw ol { list-style-type: decimal; }
        .prose-hw li { margin-top: 0.25rem; margin-bottom: 0.25rem; }
        .prose-hw li::marker { color: var(--color-fg-muted); }

        .prose-hw blockquote {
          border-left: 3px solid var(--color-primary-400);
          background: color-mix(in srgb, var(--color-primary-500) 10%, transparent);
          padding: 0.75rem 1rem;
          margin: 0.75rem 0;
          font-family: var(--font-ui, 'Inter', sans-serif);
          font-size: 0.875rem;
          color: var(--color-fg-muted);
          font-style: italic;
          line-height: 1.6;
          border-radius: 0 0.375rem 0.375rem 0;
        }

        .prose-hw hr {
          border: none;
          border-top: 1px solid var(--color-border);
          margin: 1.5rem 0;
        }

        .prose-hw table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-ui, 'Inter', sans-serif);
          font-size: 0.8125rem;
          margin: 1rem 0;
          border: 1px solid var(--color-border);
          border-radius: 0;
        }
        .prose-hw thead {
          background: var(--color-bg-elevated);
          border-bottom: 1px solid var(--color-border);
        }
        .prose-hw th {
          padding: 0.625rem 0.875rem;
          text-align: left;
          font-family: var(--font-display, 'Share Tech', sans-serif);
          font-weight: 600;
          color: var(--color-fg-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-right: 1px solid var(--color-border);
        }
        .prose-hw th:last-child { border-right: none; }
        .prose-hw td {
          padding: 0.5rem 0.875rem;
          border-bottom: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          color: var(--color-fg);
          opacity: 0.9;
        }
        .prose-hw td:last-child { border-right: none; }
        .prose-hw tbody tr:hover td {
          background: color-mix(in srgb, var(--color-primary-500) 6%, var(--color-bg-card));
        }

        .prose-hw img {
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
        }

        .prose-hw .prose-callout {
          border: 1px solid;
          padding: 0.75rem 1rem;
          margin: 0.75rem 0;
          font-family: var(--font-ui, 'Inter', sans-serif);
          font-size: 0.8125rem;
          line-height: 1.6;
          border-radius: 0.5rem;
        }
        .prose-hw .prose-callout.info {
          border-color: var(--color-info);
          background: color-mix(in srgb, var(--color-info) 8%, transparent);
          color: var(--color-fg);
        }
        .prose-hw .prose-callout.warn {
          border-color: var(--color-warning);
          background: color-mix(in srgb, var(--color-warning) 8%, transparent);
          color: var(--color-fg);
        }
        .prose-hw .prose-callout.crit {
          border-color: var(--color-danger);
          background: color-mix(in srgb, var(--color-danger) 8%, transparent);
          color: var(--color-fg);
        }
        .prose-hw .prose-callout.note,
        .prose-hw .prose-callout.tip {
          border-color: var(--color-primary-400);
          background: color-mix(in srgb, var(--color-primary-500) 8%, transparent);
          color: var(--color-fg);
        }

        .prose-hw .prose-chart {
          border: 1px solid var(--color-border);
          background: var(--color-bg-card);
          padding: 1rem;
          margin: 1rem 0;
        }
        .prose-hw .prose-chart-title {
          font-family: var(--font-display);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-fg);
          margin-bottom: 0.5rem;
        }

        .prose-hw .prose-metric-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          margin: 1rem 0;
        }
        .prose-hw .prose-metric {
          background: var(--color-bg-card);
          padding: 0.75rem 1rem;
          text-align: center;
        }
        .prose-hw .prose-metric-value {
          font-family: var(--font-data, 'JetBrains Mono', monospace);
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--color-primary-600);
        }
        .prose-hw .prose-metric-label {
          font-family: var(--font-ui);
          font-size: 0.6875rem;
          color: var(--color-fg-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }
      `}</style>
      {children}
    </div>
  );
}

// ── Quick inline chart (SVG bar / line) ──────────────────────────────────────

interface ChartBar {
  label: string;
  value: number;
  color?: string;
}

export function ProseBarChart({
  title,
  data,
  height = 140,
}: {
  title?: string;
  data: ChartBar[];
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = data.length * 48 + 48;
  const h = height;
  const pad = { l: 36, r: 14, t: 20, b: 28 };

  return (
    <div className="prose-chart border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 my-3 rounded-none">
      {title && (
        <div className="prose-chart-title font-display text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">
          {title}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible" preserveAspectRatio="xMidYMid meet">
        {[0, 0.5, 1].map(p => {
          const y = pad.t + (1 - p) * (h - pad.t - pad.b);
          const val = Math.round(max * p);
          return (
            <g key={p}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <text x={pad.l - 4} y={y + 3.5} textAnchor="end" className="fill-[var(--color-fg-muted)]" fontSize="10" fontFamily="var(--font-data)">
                {val}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bw = 28;
          const barH = (d.value / max) * (h - pad.t - pad.b);
          const x = pad.l + i * 48 + (48 - bw) / 2;
          const y = pad.t + (h - pad.t - pad.b) - barH;
          return (
            <g key={i} className="group cursor-pointer">
              <rect
                x={x}
                y={y}
                width={bw}
                height={Math.max(barH, 2)}
                rx="0"
                fill={d.color || 'var(--color-primary-600)'}
                className="transition-all duration-150 opacity-90 group-hover:opacity-100"
              />
              <text x={x + bw / 2} y={h - 8} textAnchor="middle" className="fill-[var(--color-fg-muted)]" fontSize="11" fontFamily="var(--font-ui)" fontWeight="500">
                {d.label}
              </text>
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" className="fill-[var(--color-fg)]" fontSize="11" fontFamily="var(--font-data)" fontWeight="700">
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Mini horizontal bar chart ────────────────────────────────────────────────

interface HBData {
  label: string;
  value: number;  // 0-100 percentage-like
  color?: string;
}

export function ProseHorizontalBarChart({
  title,
  data,
}: {
  title?: string;
  data: HBData[];
}) {
  return (
    <div className="prose-chart border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 my-3 rounded-none">
      {title && (
        <div className="prose-chart-title font-display text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">
          {title}
        </div>
      )}
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs">
            <span className="w-32 shrink-0 font-ui text-[11px] font-medium text-[var(--color-fg-muted)] text-right truncate" title={d.label}>
              {d.label}
            </span>
            <div className="flex-1 h-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)]/50 rounded-none overflow-hidden">
              <div
                className="h-full rounded-none transition-all duration-300"
                style={{
                  width: `${Math.min(Math.max(d.value, 0), 100)}%`,
                  backgroundColor: d.color || 'var(--color-primary-600)',
                }}
              />
            </div>
            <span className="w-10 shrink-0 font-mono text-[11px] font-bold text-[var(--color-fg)] text-right">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
