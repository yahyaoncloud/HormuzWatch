import React from 'react';
import { ExternalLink } from 'lucide-react';
import { FeedEvent } from './FeedEvent';
import { FeedEventMeta } from './FeedEventMeta';

export interface NewsArticleItem {
  id?: string | number;
  title: string;
  summary?: string;
  description?: string;
  source?: string;
  source_name?: string;
  url?: string;
  link?: string;
  published_at?: string;
  created_at?: string;
  timestamp?: string;
  category?: string;
  sentiment?: number;
  risk_score?: number;
}

export interface NewsFeedEventProps {
  article: NewsArticleItem;
}

export const NewsFeedEvent: React.FC<NewsFeedEventProps> = ({ article }) => {
  const title = article.title;
  const description = article.summary || article.description || '';
  const url = article.url || article.link || '#';
  const sourceName = article.source_name || article.source || 'OSINT NEWS';
  const timestamp = article.published_at || article.created_at || article.timestamp || new Date().toISOString();

  return (
    <FeedEvent
      id={String(article.id || title)}
      typeBadge="OSINT NEWS DISPATCH"
      typeColor="text-[var(--color-primary-600)] dark:text-[#38bdf8] border-[var(--color-border)] bg-[var(--color-bg-input)]"
      timestamp={timestamp}
      actions={
        url && url !== '#' ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[var(--color-border)] bg-[var(--color-bg-input)] font-mono text-[9px] font-bold text-[var(--color-primary-600)] dark:text-[#38bdf8] hover:bg-[var(--color-bg-hover)] uppercase active:translate-y-px"
          >
            <span>OPEN SOURCE</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : null
      }
    >
      <div className="space-y-1.5">
        <h4 className="font-mono text-xs font-bold text-[var(--color-fg)] uppercase line-clamp-2">
          {title}
        </h4>

        {description && (
          <p className="font-mono text-[11px] text-[var(--color-fg-muted)] line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        <FeedEventMeta
          source={sourceName}
          sourceType={article.category || 'Regional Geopolitics'}
          score={article.risk_score}
        />
      </div>
    </FeedEvent>
  );
};
