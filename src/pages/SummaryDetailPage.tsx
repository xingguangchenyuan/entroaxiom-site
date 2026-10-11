import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSummary } from '../content/loader';
import type { Summary } from '../content/types';
import { copy } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { Markdown, type Heading } from '../components/reading/Markdown';
import { Toc } from '../components/reading/Toc';
import { DemoBadge } from '../components/list/DemoBadge';

export function SummaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ready, setReady] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    setHeadings([]);
    if (!id) {
      setReady(true);
      return;
    }
    getSummary(id).then((s) => {
      if (!alive) return;
      setSummary(s ?? null);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useDocumentTitle(summary?.title);

  if (!ready || summary === null) {
    return (
      <ContentPanel>
        {ready && (
          <div className="state-empty">
            <p className="state-text">{copy.contentMissing}</p>
            <Link className="state-action" to="/summaries">
              {copy.backToList}
            </Link>
          </div>
        )}
      </ContentPanel>
    );
  }

  return (
    <ContentPanel>
      <div className="reading-layout">
        <article className="reading-main">
          <header className="reading-page-header">
            <Link className="reading-back-link" to="/summaries">
              ← {copy.backToList}
            </Link>
            <DemoBadge />
            <h1 className="reading-title">{summary.title}</h1>
            {(summary.category || summary.date || summary.updated) && (
              <p className="reading-meta">
                {summary.category && <span className="reading-meta-item">{summary.category}</span>}
                {summary.date && <time>{summary.date}</time>}
                {summary.updated && summary.updated !== summary.date && (
                  <time>更新于 {summary.updated}</time>
                )}
                {summary.tags?.map((tag) => (
                  <span key={tag} className="reading-tag">
                    {tag}
                  </span>
                ))}
              </p>
            )}
          </header>
          <Markdown body={summary.body} onHeadings={setHeadings} />
        </article>
        <Toc headings={headings} />
      </div>
    </ContentPanel>
  );
}