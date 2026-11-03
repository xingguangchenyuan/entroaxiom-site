import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCorpus } from '../hooks/useCorpus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { worldByKey } from '../config/worlds';
import { byRecent, type Corpus } from '../content/corpus';
import type { ContentType } from '../content/types';
import { StarChart } from '../components/atlas/StarChart';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { DemoBadge } from '../components/list/DemoBadge';

type View = 'chart' | 'timeline' | 'tags';
const KINDS: ContentType[] = ['essays', 'notes', 'shelf', 'files'];

/* ---------- 星盘 ---------- */
function ChartView({ corpus }: { corpus: Corpus }) {
  const [hidden, setHidden] = useState<Set<ContentType>>(new Set());
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag');
  const setTag = (t: string | null) => {
    const n = new URLSearchParams(params);
    if (t) n.set('tag', t);
    else n.delete('tag');
    setParams(n, { replace: true });
  };
  const toggle = (k: ContentType) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div className="atlas-chart">
      <div className="atlas-legend" role="group" aria-label="显示的模块">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="atlas-legend__item"
            aria-pressed={!hidden.has(k)}
            onClick={() => toggle(k)}
            style={{ ['--c' as string]: worldByKey[k].color } as CSSProperties}
          >
            <i aria-hidden="true" /> {worldByKey[k].module} <span className="chip__n">{corpus.counts[k]}</span>
          </button>
        ))}
      </div>
      <StarChart entries={corpus.entries} hidden={hidden} tag={tag} onTag={setTag} />
      <div className="atlas-constellations">
        <p className="latin">Constellationes · 选一个标签，连成星座</p>
        <div className="atlas-constellations__row">
          {corpus.tags.slice(0, 24).map((t) => (
            <button key={t.name} type="button" className="chip" aria-pressed={tag === t.name} onClick={() => setTag(tag === t.name ? null : t.name)}>
              {t.name}
              <span className="chip__n">{t.count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 轨迹（时间线） ---------- */
function TimelineView({ corpus }: { corpus: Corpus }) {
  const groups = useMemo(() => {
    const m = new Map<string, Corpus['entries']>();
    [...corpus.entries].filter((e) => e.date).sort(byRecent).forEach((e) => {
      const k = e.date!.slice(0, 7);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    });
    return [...m];
  }, [corpus]);
  return (
    <ol className="trail" role="list">
      {groups.map(([month, list]) => (
        <li key={month} className="trail__month">
          <h2 className="trail__m latin">{month.replace('-', ' · ')}</h2>
          <ul role="list">
            {list.map((e) => (
              <li key={`${e.kind}:${e.id}`} style={{ ['--c' as string]: worldByKey[e.kind].color } as CSSProperties}>
                <Link to={e.to} className="trail__item">
                  <span className="trail__dot" aria-hidden="true" />
                  <span className="readout">{e.date!.slice(5, 10)}</span>
                  <span className="trail__title">{e.title}</span>
                  <span className="trail__mod">{worldByKey[e.kind].module}</span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 标签星云 ---------- */
function TagsView({ corpus }: { corpus: Corpus }) {
  const max = Math.max(1, ...corpus.tags.map((t) => t.count));
  const hues = ['#ef8456', '#9fd6e0', '#ab93ff', '#e9bd5e', '#72e0b9', '#f2a7c3'];
  return (
    <div className="nebula-cloud">
      {corpus.tags.map((t, i) => (
        <Link
          key={t.name}
          to={`/atlas?tag=${encodeURIComponent(t.name)}`}
          className="nebula-cloud__tag"
          style={{ ['--w' as string]: t.count / max, ['--c' as string]: hues[i % hues.length] } as CSSProperties}
        >
          {t.name}
          <sup className="mono">{t.count}</sup>
        </Link>
      ))}
    </div>
  );
}

/**
 * 星图：全站内容的三种投影。
 *  - 星盘：极坐标，角度=模块，半径=时间，悬停连星座；
 *  - 轨迹：按月份的时间线；
 *  - 星云：标签云，点击后回到星盘并点亮该星座。
 */
export function AtlasPage() {
  useDocumentTitle('星图');
  const c = useCorpus();
  const [params, setParams] = useSearchParams();
  const view = (['chart', 'timeline', 'tags'].includes(params.get('view') ?? '') ? params.get('view') : 'chart') as View;
  const setView = (v: View) => {
    const n = new URLSearchParams(params);
    if (v === 'chart') n.delete('view');
    else n.set('view', v);
    if (v !== 'chart') n.delete('tag');
    setParams(n, { replace: true });
  };

  return (
    <main id="main" className="page page--wide" tabIndex={-1} data-hue="rose">
      <header className="atlas-head">
        <p className="latin">Atlas Coelestis · 天球图</p>
        <h1 className="display atlas-head__title">星图</h1>
        <p className="atlas-head__lead">所有写下的、读过的、保存的，都在这张图上。越靠近中心的视界，越接近此刻。</p>
        <div className="atlas-head__bar">
          <Segmented<View>
            label="投影方式"
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: '星盘' },
              { value: 'timeline', label: '轨迹' },
              { value: 'tags', label: '星云' },
            ]}
          />
          <DemoBadge />
        </div>
      </header>

      {c.status === 'loading' && <div className="skeleton"><div className="skeleton__row" /><div className="skeleton__row" /></div>}
      {c.status === 'error' && <ErrorState onRetry={c.retry} />}
      {c.status === 'ready' && c.corpus.entries.length === 0 && <EmptyState message="星图还是空的。" />}
      {c.status === 'ready' && c.corpus.entries.length > 0 && (
        <>
          {view === 'chart' && <ChartView corpus={c.corpus} />}
          {view === 'timeline' && <TimelineView corpus={c.corpus} />}
          {view === 'tags' && <TagsView corpus={c.corpus} />}
        </>
      )}
    </main>
  );
}
