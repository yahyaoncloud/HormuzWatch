import { useCallback, useState } from 'react';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'WS';

export interface APIParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  example?: string;
}

export interface APILanguageExample {
  lang: 'curl' | 'js' | 'python' | 'go';
  code: string;
}

export interface APIExampleBlockProps {
  endpoint: string;
  method: HTTPMethod;
  description?: string;
  params?: APIParam[];
  examples: APILanguageExample[];
  sampleResponse?: string;
  baseUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<HTTPMethod, string> = {
  GET: 'bg-success/20 text-success',
  POST: 'bg-warning/20 text-warning',
  PUT: 'bg-info/20 text-info',
  DELETE: 'bg-danger/20 text-danger',
  PATCH: 'bg-primary/20 text-primary',
  WS: 'bg-info/20 text-info',
};

const LANG_LABELS: Record<string, string> = {
  curl: 'cURL',
  js: 'JavaScript',
  python: 'Python',
  go: 'Go',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function APIExampleBlock({
  endpoint,
  method,
  description,
  params = [],
  examples,
  sampleResponse,
  baseUrl = 'https://api.hormuzwatch.com',
}: APIExampleBlockProps) {
  const [activeLang, setActiveLang] = useState(examples[0]?.lang ?? 'curl');
  const [copied, setCopied] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const activeCode = examples.find((e) => e.lang === activeLang)?.code ?? '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [activeCode]);

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-background-elevated/20">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-background-elevated/50 border-b border-border/50">
        <span
          className={cn(
            'px-2 py-0.5 rounded text-caption font-data font-bold',
            METHOD_COLORS[method]
          )}
        >
          {method}
        </span>
        <code className="font-data text-sm text-fg flex-1 min-w-0 truncate">
          <span className="text-fg-muted">{baseUrl}</span>
          <span className="text-primary">{endpoint}</span>
        </code>
      </div>

      {description && (
        <div className="px-4 py-3 border-b border-border/30">
          <p className="font-ui text-body-sm text-fg-muted">{description}</p>
        </div>
      )}

      {/* Params */}
      {params.length > 0 && (
        <div className="px-4 py-3 border-b border-border/30">
          <p className="font-ui text-caption text-fg-subtle uppercase tracking-wider mb-2">
            Parameters
          </p>
          <div className="space-y-1.5">
            {params.map((p) => (
              <div key={p.name} className="flex flex-wrap items-baseline gap-2 text-body-sm">
                <code className="font-data text-primary">{p.name}</code>
                <span className="font-data text-caption text-fg-muted">{p.type}</span>
                {p.required && (
                  <span className="text-caption text-danger font-medium">required</span>
                )}
                <span className="text-fg-muted">— {p.description}</span>
                {p.example && (
                  <span className="font-data text-caption text-fg-subtle">e.g. {p.example}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30 bg-background-elevated/30">
        {examples.map((e) => (
          <button
            key={e.lang}
            onClick={() => setActiveLang(e.lang)}
            className={cn(
              'px-3 py-1 rounded text-caption font-medium transition-colors',
              activeLang === e.lang
                ? 'bg-primary text-primary-foreground'
                : 'text-fg-muted hover:text-fg hover:bg-background-elevated'
            )}
          >
            {LANG_LABELS[e.lang]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-caption text-fg-muted hover:text-fg hover:bg-background-elevated transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg
                className="w-3.5 h-3.5 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <pre className="p-4 overflow-x-auto bg-background-elevated/10">
        <code className="font-data text-sm text-fg/90 leading-relaxed">{activeCode}</code>
      </pre>

      {/* Sample Response Toggle */}
      {sampleResponse && (
        <>
          <div className="px-4 py-2 border-t border-border/30">
            <button
              onClick={() => setShowResponse((v) => !v)}
              className="flex items-center gap-2 font-ui text-body-sm text-fg-muted hover:text-fg transition-colors"
            >
              <svg
                className={cn('w-4 h-4 transition-transform', showResponse && 'rotate-90')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Sample Response
            </button>
          </div>
          {showResponse && (
            <pre className="border-t border-border/30 p-4 overflow-x-auto bg-success/5">
              <code className="font-data text-xs text-fg/80 leading-relaxed">{sampleResponse}</code>
            </pre>
          )}
        </>
      )}
    </div>
  );
}
