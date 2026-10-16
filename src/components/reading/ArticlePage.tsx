import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getNote, getSummary } from '../../content/loader';
import type { Note, Summary } from '../../content/types';
import { copy } from '../../config/site';
import { worldByKey } from '../../config/worlds';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { readingMinutes } from '../../lib/readingTime';
import { Markdown, type Heading } from './Markdown';
import { Toc } from './Toc';
import { ArticleExtras } from './ArticleExtras';
import { DemoBadge } from '../list/DemoBadge';
import { ErrorState } from '../state/ErrorState';
import { NotFoundState } from '../state/NotFoundState';
import { IconBack, IconClock } from '../ui/Icons';

/** 笔记与总结共用的阅读页：同样的结构，数据来源不同 */
export function ArticlePage({ kind }: { kind: 'notes' | 'summaries' }) {
  const { id } = useParams<{ id: string }>();
  const world = worldByKey[kind];
  const state = useAsync<Note | Summary | undefined>(() => (id ? (kind === 'notes' ? getNote(id) : getSummary(id)) : Promise.resolve(undefined)), [id, kind]);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const bodyRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useReadingProgress(bodyRef, barRef);

  const item = state.status === 'ready' ? state.data : undefined;
  useDocumentTitle(item?.title);

  if (state.status === 'error') {
    return (
      <main id="main" className="page page--read" tabIndex={-1}>
        <ErrorState onRetry={state.retry} />
      </main>
    );
  }
  if (state.status === 'loading') {
    return (
      <main id="main" className="page page--read" tabIndex={-1} aria-busy="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--body" />
      </main>
    );
  }
  if (!item) {
    return (
      <main id="main" className="page page--read" tabIndex={-1}>
        <NotFoundState title={copy.contentMissing} desc={copy.contentMissingDesc} />
      </main>
    );
  }

  const minutes = readingMinutes(item.body);
  return (
    <main id="main" className="page page--read" tabIndex={-1}>
      <div className="progress" ref={barRef} aria-hidden="true"><span /></div>
      <header className="article__head">
        <Link to={world.path} className="text-action article__back">
          <IconBack size={15} /> {copy.backToList}
        </Link>
        <h1 className="article__title display">{item.title}</h1>
        <div className="article__meta">
          <span className={`tag tag--${world.tone === 'frost' ? 'frost' : 'gold'}`}>{world.module}</span>
          {item.category && <span className="tag">{item.category}</span>}
          {item.date && <time className="article__time">{item.date}</time>}
          {item.updated && item.updated !== item.date && <time className="article__time">更新于 {item.updated}</time>}
          <span className="article__time"><IconClock size={14} /> 约 {minutes} 分钟</span>
          <DemoBadge />
        </div>
        {item.summary && <p className="article__abstract">{item.summary}</p>}
        {item.tags && item.tags.length > 0 && (
          <p className="article__tags">
            {item.tags.map((t) => <Link key={t} className="tag" to={`/${kind}?q=${encodeURIComponent(t)}`}>{t}</Link>)}
          </p>
        )}
      </header>

      <div className="article__layout">
        <article className="article__body glass glass--flat" ref={bodyRef}>
          <Markdown body={item.body} onHeadings={setHeadings} />
        </article>
        <Toc headings={headings} />
      </div>
      <ArticleExtras kind={kind} id={item.id} tags={item.tags} category={item.category} />
    </main>
  );
}
