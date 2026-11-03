import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEssay, getNote, peekEssay, peekNote } from '../../content/loader';
import type { Essay, Note } from '../../content/types';
import { copy } from '../../config/site';
import { worldByKey } from '../../config/worlds';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { RESTORE_SCROLL } from '../../hooks/useScrollRestore';
import { readingMinutes } from '../../lib/readingTime';
import { Markdown, type Heading } from './Markdown';
import { Toc } from './Toc';
import { ArticleNeighbors } from './ArticleNeighbors';
import { DemoBadge } from '../list/DemoBadge';
import { ErrorState } from '../state/ErrorState';
import { NotFoundState } from '../state/NotFoundState';
import { IconBack, IconClock } from '../ui/Icons';

type Kind = 'essays' | 'notes';

/**
 * 随笔与笔记共用的阅读页：
 *  - 随笔：居中的单栏“信笺”，首字下沉，页眉写着心境与地点，不显示目录；
 *  - 笔记：左正文右目录的“观测记录”，带分类与标签。
 * 顶部一条随模块变色的阅读进度轨道。
 */
export function ArticlePage({ kind }: { kind: Kind }) {
  const { id } = useParams<{ id: string }>();
  const world = worldByKey[kind];
  const state = useAsync<Essay | Note | undefined>(() => (id ? (kind === 'notes' ? getNote(id) : getEssay(id)) : Promise.resolve(undefined)), [id, kind], () => (id ? (kind === 'notes' ? peekNote(id) : peekEssay(id)) : undefined));
  const [headings, setHeadings] = useState<Heading[]>([]);
  const bodyRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useReadingProgress(bodyRef, barRef);

  const item = state.status === 'ready' ? state.data : undefined;
  useDocumentTitle(item?.title, item?.summary);

  if (state.status === 'error') {
    return (
      <main id="main" className="page page--read" tabIndex={-1} data-hue={world.hue}>
        <ErrorState onRetry={state.retry} />
      </main>
    );
  }
  if (state.status === 'loading') {
    return (
      <main id="main" className="page page--read" tabIndex={-1} aria-busy="true" data-hue={world.hue}>
        <div className="skeleton"><div className="skeleton__row" /><div className="skeleton__row" /></div>
      </main>
    );
  }
  if (!item) {
    return (
      <main id="main" className="page page--read" tabIndex={-1} data-hue={world.hue}>
        <NotFoundState title={copy.contentMissing} desc={copy.contentMissingDesc} />
      </main>
    );
  }

  const minutes = readingMinutes(item.body);
  const essay = kind === 'essays' ? (item as Essay) : null;

  return (
    <main id="main" className={`page page--read article--${kind}`} tabIndex={-1} data-hue={world.hue}>
      <div className="progress" ref={barRef} aria-hidden="true"><span /></div>
      <header className="article__head">
        <Link to={world.path} state={RESTORE_SCROLL} className="text-action article__back">
          <IconBack size={15} /> {copy.backToList} · {world.module}
        </Link>
        <p className="latin article__latin">{world.latin} · {(item.updated ?? item.date ?? '').slice(0, 10)}</p>
        <h1 className="article__title display">{item.title}</h1>
        <div className="article__meta">
          {item.category && <span className="tag">{item.category}</span>}
          {essay?.mood && <span className="article__chip">心境 · {essay.mood}</span>}
          {essay?.place && <span className="article__chip">@ {essay.place}</span>}
          {item.updated && item.date && item.updated !== item.date && <time className="article__time">更新于 {item.updated}</time>}
          <span className="article__time"><IconClock size={14} /> 约 {minutes} 分钟</span>
          <DemoBadge />
        </div>
        {item.summary && <p className="article__abstract">{item.summary}</p>}
      </header>

      <div className={`article__layout${kind === 'notes' && headings.length >= 3 ? ' has-toc' : ''}`}>
        <article className="article__body" ref={bodyRef}>
          <Markdown body={item.body} onHeadings={setHeadings} />
          {item.tags && item.tags.length > 0 && (
            <p className="article__tags">
              {item.tags.map((t) => (
                <Link key={t} className="tag" to={`/${kind}?q=${encodeURIComponent(t)}`}>{t}</Link>
              ))}
            </p>
          )}
          {essay && <p className="article__sign display">— 写于{essay.place ?? '某处'}，{(item.date ?? '').slice(0, 10)}</p>}
        </article>
        {kind === 'notes' && <Toc headings={headings} />}
      </div>
      <ArticleNeighbors kind={kind} id={item.id} tags={item.tags} />
    </main>
  );
}
