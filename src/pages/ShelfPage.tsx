import { useMemo, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listShelf, peekShelf } from '../content/loader';
import type { ShelfKind, ShelfStatus } from '../content/types';
import { copy } from '../config/site';
import { worldByKey } from '../config/worlds';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ModuleHeader } from '../components/list/ModuleHeader';
import { DemoBadge } from '../components/list/DemoBadge';
import { Stars } from '../components/shelf/Stars';
import { Cover, KindIcon, SHELF_KIND, SHELF_STATUS, ShelfDrawer } from '../components/shelf/ShelfDrawer';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { NoResults } from '../components/state/NoResults';

type KindFilter = 'all' | ShelfKind;
type StatusFilter = 'all' | ShelfStatus;

/**
 * 书影音：气态巨星的光环。
 * 顶部是三色“光谱”切换（书/影/音），状态用航行隐喻（已抵达/航行中/待观测）。
 * “航行中”的条目单独置顶为一条横向轨道；其余为星云封面墙。点击卡片从右侧抽屉展开短评（?item=id 可分享）。
 */
export function ShelfPage() {
  const world = worldByKey.shelf;
  useDocumentTitle(world.module);
  const state = useAsync(() => listShelf(), [], peekShelf);
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') as KindFilter) || 'all';
  const status = (params.get('status') as StatusFilter) || 'all';
  const openId = params.get('item');

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v == null || v === 'all') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: k !== 'item' });
  };

  const all = state.status === 'ready' ? state.data : [];
  const shown = useMemo(
    () =>
      all
        .filter((i) => (kind === 'all' || i.kind === kind) && (status === 'all' || i.status === status))
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [all, kind, status],
  );
  const doing = status === 'all' ? shown.filter((i) => i.status === 'doing') : [];
  const rest = status === 'all' ? shown.filter((i) => i.status !== 'doing') : shown;
  const open = openId ? all.find((i) => i.id === openId) : undefined;

  const tally = useMemo(() => {
    const t: Record<ShelfKind, number> = { book: 0, film: 0, music: 0 };
    all.forEach((i) => (t[i.kind] += 1));
    return t;
  }, [all]);

  return (
    <main id="main" className="page" tabIndex={-1} data-hue={world.hue}>
      <ModuleHeader world={world} total={state.status === 'ready' ? all.length : undefined} unit="件">
        <DemoBadge />
      </ModuleHeader>

      <div className="shelf-bar">
        <div className="shelf-kinds" role="group" aria-label="按类型">
          <button type="button" className="shelf-kind" aria-pressed={kind === 'all'} onClick={() => set('kind', 'all')}>
            <span className="latin">Omnia</span> 全部 <span className="chip__n">{all.length}</span>
          </button>
          {(Object.keys(SHELF_KIND) as ShelfKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className="shelf-kind"
              aria-pressed={kind === k}
              onClick={() => set('kind', k)}
              style={{ ['--c' as string]: SHELF_KIND[k].color } as CSSProperties}
            >
              <KindIcon kind={k} /> <span className="latin">{SHELF_KIND[k].latin}</span> {SHELF_KIND[k].label}
              <span className="chip__n">{tally[k]}</span>
            </button>
          ))}
        </div>
        <Segmented<StatusFilter>
          label="按状态"
          value={status}
          onChange={(v) => set('status', v)}
          options={[
            { value: 'all', label: '全部' },
            { value: 'done', label: SHELF_STATUS.done },
            { value: 'doing', label: SHELF_STATUS.doing },
            { value: 'want', label: SHELF_STATUS.want },
          ]}
        />
      </div>

      {state.status === 'loading' && <div className="skeleton"><div className="skeleton__row" /><div className="skeleton__row" /></div>}
      {state.status === 'error' && <ErrorState onRetry={state.retry} />}
      {state.status === 'ready' && all.length === 0 && <EmptyState message={copy.empty.shelf} />}
      {state.status === 'ready' && all.length > 0 && shown.length === 0 && <NoResults onClear={() => setParams(new URLSearchParams(), { replace: true })} />}

      {doing.length > 0 && (
        <section className="shelf-doing" aria-label="航行中">
          <p className="latin shelf-doing__k">In Itinere · 航行中</p>
          <ul role="list">
            {doing.map((i) => (
              <li key={i.id}>
                <button type="button" className="shelf-doing__item" onClick={() => set('item', i.id)} style={{ ['--c' as string]: SHELF_KIND[i.kind].color } as CSSProperties}>
                  <Cover item={i} />
                  <span>
                    <span className="shelf-doing__title">{i.title}</span>
                    <span className="shelf-doing__creator">{i.creator}</span>
                    {i.quote && <span className="shelf-doing__quote">“{i.quote}”</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <ul className="shelf-wall" role="list">
          {rest.map((i, n) => (
            <li key={i.id} style={{ ['--i' as string]: n } as CSSProperties}>
              <button type="button" className="shelf-card lit" onClick={() => set('item', i.id)} style={{ ['--c' as string]: SHELF_KIND[i.kind].color } as CSSProperties}>
                <Cover item={i} />
                <span className="shelf-card__body">
                  <span className="shelf-card__title">{i.title}</span>
                  <span className="shelf-card__creator">
                    {i.creator}
                    {i.year && ` · ${i.year}`}
                  </span>
                  <span className="shelf-card__foot">
                    {i.rating != null ? <Stars value={i.rating} size={12} /> : <span className="readout">{SHELF_STATUS[i.status]}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <ShelfDrawer item={open} onClose={() => set('item', null)} />}
    </main>
  );
}
