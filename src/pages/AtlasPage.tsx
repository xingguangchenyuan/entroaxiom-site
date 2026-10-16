import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCorpus } from '../hooks/useCorpus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { worldByKey } from '../config/worlds';
import type { Corpus, Entry } from '../content/corpus';
import type { ContentType } from '../content/types';
import { ConstellationGraph } from '../components/atlas/ConstellationGraph';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { DemoBadge } from '../components/list/DemoBadge';
import { IconArrow } from '../components/ui/Icons';

type View = 'graph' | 'timeline' | 'tags';
const VIEWS: { value: View; label: string }[] = [
  { value: 'graph', label: '星座' },
  { value: 'timeline', label: '轨迹' },
  { value: 'tags', label: '标签' },
];
const toneTag = (k: ContentType) => (worldByKey[k].tone === 'frost' ? 'frost' : worldByKey[k].tone === 'gold' ? 'gold' : 'moss');
const KIND_COLOR: Record<ContentType, string> = { notes: 'var(--frost)', summaries: 'var(--axiom)', files: 'var(--moss)' };

/* ---------- 星座 ---------- */
function GraphView({ corpus }: { corpus: Corpus }) {
  const [hidden, setHidden] = useState<Set<ContentType>>(new Set());
  const [hub, setHub] = useState<string | null>(null);

  const toggle = (k: ContentType) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const hubEntries = useMemo<Entry[]>(() => {
    if (!hub) return [];
    const [type, name] = [hub.slice(0, hub.indexOf(':')), hub.slice(hub.indexOf(':') + 1)];
    return corpus.entries.filter((e) => (type === 'cat' ? e.category === name : type === 'tag' ? e.tags.includes(name) : type === 'fk' ? e.fileKind === name : false));
  }, [hub, corpus]);

  return (
    <>
      <div className="atlas-bar">
        <div className="atlas-legend" role="group" aria-label="显示的内容类型">
          {(['notes', 'summaries', 'files'] as ContentType[]).map((k) => (
            <button key={k} type="button" className="chip" style={{ ['--c' as string]: KIND_COLOR[k] }} aria-pressed={!hidden.has(k)} onClick={() => toggle(k)}>
              {worldByKey[k].module}
              <span className="chip__n">{corpus.counts[k]}</span>
            </button>
          ))}
        </div>
        <p className="atlas-hint">悬停查看，点击星星进入；点击带名字的圆环，聚焦整个星座。</p>
      </div>
      <div className="atlas-stage glass glass--flat">
        <ConstellationGraph entries={corpus.entries} hiddenKinds={hidden} selectedHub={hub} onSelectHub={setHub} />
      </div>
      {hub && (
        <section className="atlas-side glass glass--flat" aria-live="polite">
          <div className="atlas-side__head">
            <h2 className="atlas-side__title">{hub.slice(hub.indexOf(':') + 1)}</h2>
            <button type="button" className="text-action" onClick={() => setHub(null)}>取消聚焦</button>
          </div>
          <ul className="hit-list">
            {hubEntries.map((e) => (
              <li key={`${e.kind}:${e.id}`}>
                <Link className="hit" to={e.to}>
                  <span className={`tag tag--${toneTag(e.kind)}`}>{worldByKey[e.kind].module}</span>
                  <span className="hit__title">{e.title}</span>
                  {e.summary && <span className="hit__sum">{e.summary}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* ---------- 轨迹（时间线） ---------- */
function TimelineView({ corpus }: { corpus: Corpus }) {
  const groups = useMemo(() => {
    const dated = corpus.entries.filter((e) => e.date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    const undated = corpus.entries.filter((e) => !e.date);
    const map = new Map<string, Entry[]>();
    for (const e of dated) {
      const key = (e.date as string).slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    const out = [...map.entries()].map(([k, items]) => ({ key: k, label: `${k.slice(0, 4)} 年 ${Number(k.slice(5, 7))} 月`, items }));
    if (undated.length) out.push({ key: 'none', label: '未标注日期', items: undated });
    return out;
  }, [corpus]);

  return (
    <div className="tl">
      {groups.map((g) => (
        <section key={g.key} className="tl__group" aria-label={g.label}>
          <h2 className="tl__month">{g.label}</h2>
          <ul>
            {g.items.map((e) => (
              <li key={`${e.kind}:${e.id}`} className={`tl__item tl__item--${e.kind}`}>
                <Link to={e.to} className="tl__link">
                  <span className="tl__day">{e.date ? e.date.slice(5) : ''}</span>
                  <span>
                    <span className="tl__title">{e.title}</span>
                    {e.summary && <span className="tl__sum">{e.summary}</span>}
                  </span>
                  <span className={`tag tag--${toneTag(e.kind)}`}>{worldByKey[e.kind].module}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ---------- 标签 ---------- */
function TagsView({ corpus }: { corpus: Corpus }) {
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(1, ...corpus.tags.map((t) => t.count));
  const items = sel ? corpus.entries.filter((e) => e.tags.includes(sel) || e.category === sel) : [];
  const cats = corpus.categories;

  if (corpus.tags.length === 0 && cats.length === 0) return <EmptyState message="还没有标签" hint="给内容加上标签或分类后，它们会聚集在这里。" />;
  return (
    <>
      {cats.length > 0 && (
        <section className="tagsec" aria-label="分类">
          <h2 className="tagsec__h">分类</h2>
          <div className="tagcloud">
            {cats.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={sel === c} onClick={() => setSel(sel === c ? null : c)}>{c}</button>
            ))}
          </div>
        </section>
      )}
      {corpus.tags.length > 0 && (
        <section className="tagsec" aria-label="标签">
          <h2 className="tagsec__h">标签</h2>
          <div className="tagcloud">
            {corpus.tags.map((t) => (
              <button key={t.name} type="button" className="chip" style={{ ['--w' as string]: (t.count / max).toFixed(2) }} aria-pressed={sel === t.name} onClick={() => setSel(sel === t.name ? null : t.name)}>
                {t.name}
                <span className="chip__n">{t.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {sel && (
        <section className="atlas-side glass glass--flat" aria-live="polite">
          <div className="atlas-side__head">
            <h2 className="atlas-side__title">{sel}</h2>
            <button type="button" className="text-action" onClick={() => setSel(null)}>收起</button>
          </div>
          <ul className="hit-list">
            {items.map((e) => (
              <li key={`${e.kind}:${e.id}`}>
                <Link className="hit" to={e.to}>
                  <span className={`tag tag--${toneTag(e.kind)}`}>{worldByKey[e.kind].module}</span>
                  <span className="hit__title">{e.title}</span>
                  {e.summary && <span className="hit__sum">{e.summary}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const LEADS: Record<View, string> = {
  graph: '每一篇内容是一颗星，同一个标签或分类把它们连成星座。',
  timeline: '按时间倒着走一遍：什么时候读了什么，写了什么。',
  tags: '换一个角度：不按类型，按主题找。',
};

export function AtlasPage() {
  useDocumentTitle('星图');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const c = useCorpus();
  const raw = params.get('view');
  const view: View = raw === 'timeline' || raw === 'tags' ? raw : 'graph';
  const setView = (v: View) => navigate(v === 'graph' ? '/atlas' : `/atlas?view=${v}`, { replace: true });

  return (
    <main id="main" className="page" tabIndex={-1}>
      <header className="page__head">
        <h1 className="page__title display">星图</h1>
        <p className="page__lead">{LEADS[view]}</p>
        <div className="page__meta">
          <Segmented<View> label="星图视图" value={view} onChange={setView} options={VIEWS} />
          <DemoBadge />
        </div>
      </header>

      {c.status === 'loading' && <div className="skeleton skeleton--stage" aria-busy="true" aria-label="正在加载" />}
      {c.status === 'error' && <ErrorState onRetry={c.retry} />}
      {c.status === 'ready' && c.corpus.entries.length === 0 && <EmptyState message="星图还是空的" hint="有内容公开后，每一篇都会成为这里的一颗星。" />}
      {c.status === 'ready' && c.corpus.entries.length > 0 && (
        <>
          {view === 'graph' && <GraphView corpus={c.corpus} />}
          {view === 'timeline' && <TimelineView corpus={c.corpus} />}
          {view === 'tags' && <TagsView corpus={c.corpus} />}
          <p className="atlas-foot">
            <Link to="/axioms" className="text-action">这个站点为什么叫 entroaxiom <IconArrow size={14} /></Link>
          </p>
        </>
      )}
    </main>
  );
}
