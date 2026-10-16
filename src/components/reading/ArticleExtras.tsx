import { Link } from 'react-router-dom';
import { useCorpus } from '../../hooks/useCorpus';
import { worldByKey } from '../../config/worlds';
import type { ContentType } from '../../content/types';
import type { Entry } from '../../content/corpus';
import { IconArrow, IconBack } from '../ui/Icons';

interface Props {
  kind: ContentType;
  id: string;
  tags?: string[];
  category?: string;
}

function related(entries: Entry[], kind: ContentType, id: string, tags: string[], category?: string): Entry[] {
  const score = (e: Entry): number => {
    let s = 0;
    for (const t of e.tags) if (tags.includes(t)) s += 2;
    if (category && e.category === category) s += 1;
    return s;
  };
  return entries
    .filter((e) => !(e.kind === kind && e.id === id))
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.e);
}

/** 文末：上一篇 / 下一篇（按同类内容的时间顺序）与“相关内容”（共享标签、分类） */
export function ArticleExtras({ kind, id, tags = [], category }: Props) {
  const c = useCorpus();
  if (c.status !== 'ready') return null;
  const same = c.corpus.entries.filter((e) => e.kind === kind).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const i = same.findIndex((e) => e.id === id);
  const newer = i > 0 ? same[i - 1] : undefined;
  const older = i >= 0 && i < same.length - 1 ? same[i + 1] : undefined;
  const rel = related(c.corpus.entries, kind, id, tags, category);
  if (!newer && !older && rel.length === 0) return null;

  return (
    <aside className="extras" aria-label="继续阅读">
      {(newer || older) && (
        <div className="extras__pn">
          {older ? (
            <Link className="pn glass glass--sm glass--interactive lit" to={older.to} rel="prev">
              <span className="pn__dir"><IconBack size={14} /> 较早的</span>
              <span className="pn__title">{older.title}</span>
            </Link>
          ) : <span />}
          {newer ? (
            <Link className="pn pn--next glass glass--sm glass--interactive lit" to={newer.to} rel="next">
              <span className="pn__dir">较新的 <IconArrow size={14} /></span>
              <span className="pn__title">{newer.title}</span>
            </Link>
          ) : <span />}
        </div>
      )}
      {rel.length > 0 && (
        <div className="extras__rel">
          <h2 className="extras__h display">同一星座的内容</h2>
          <ul>
            {rel.map((e) => (
              <li key={`${e.kind}:${e.id}`}>
                <Link to={e.to} className="hit">
                  <span className={`tag tag--${worldByKey[e.kind].tone === 'frost' ? 'frost' : worldByKey[e.kind].tone === 'gold' ? 'gold' : 'moss'}`}>{worldByKey[e.kind].module}</span>
                  <span className="hit__title">{e.title}</span>
                  {e.summary && <span className="hit__sum">{e.summary}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
