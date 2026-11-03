import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { byRecent, type Entry } from '../../content/corpus';
import { useCorpus } from '../../hooks/useCorpus';
import { worldByKey } from '../../config/worlds';
import { IconArrow, IconBack } from '../ui/Icons';

interface Props {
  kind: 'essays' | 'notes';
  id: string;
  tags?: string[];
}

/** 文末：上一篇 / 下一篇 + “引力相关”（共享标签最多的其他内容，跨模块） */
export function ArticleNeighbors({ kind, id, tags = [] }: Props) {
  const c = useCorpus();
  const { prev, next, related } = useMemo(() => {
    if (c.status !== 'ready') return { prev: undefined, next: undefined, related: [] as Entry[] };
    const same = c.corpus.entries.filter((e) => e.kind === kind).sort(byRecent);
    const i = same.findIndex((e) => e.id === id);
    const tagSet = new Set(tags);
    const related = c.corpus.entries
      .filter((e) => !(e.kind === kind && e.id === id) && e.kind !== 'files')
      .map((e) => ({ e, s: e.tags.filter((t) => tagSet.has(t)).length }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || byRecent(a.e, b.e))
      .slice(0, 4)
      .map((x) => x.e);
    return { prev: i > 0 ? same[i - 1] : undefined, next: i >= 0 && i < same.length - 1 ? same[i + 1] : undefined, related };
  }, [c, kind, id, tags]);

  if (!prev && !next && related.length === 0) return null;
  return (
    <aside className="neighbors" aria-label="继续阅读">
      {related.length > 0 && (
        <div className="neighbors__related">
          <p className="latin neighbors__k">Gravitas · 引力相关</p>
          <ul role="list">
            {related.map((e) => (
              <li key={`${e.kind}:${e.id}`} data-hue={worldByKey[e.kind].hue}>
                <Link to={e.to}>
                  <span className="led" aria-hidden="true" />
                  <span className="neighbors__title">{e.title}</span>
                  <span className="neighbors__mod">{worldByKey[e.kind].module}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <nav className="neighbors__pn" aria-label="上一篇与下一篇">
        {prev ? (
          <Link to={prev.to} className="neighbors__link">
            <span className="readout"><IconBack size={13} /> 较新</span>
            <span className="neighbors__title">{prev.title}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={next.to} className="neighbors__link neighbors__link--next">
            <span className="readout">较早 <IconArrow size={13} /></span>
            <span className="neighbors__title">{next.title}</span>
          </Link>
        ) : <span />}
      </nav>
    </aside>
  );
}
