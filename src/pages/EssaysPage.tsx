import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { copy } from '../config/site';
import { worldByKey } from '../config/worlds';
import { listEssays, peekEssays } from '../content/loader';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ALL, useListQuery } from '../hooks/useListQuery';
import { categoryCounts, filterItems, groupByYear } from '../lib/listFilter';
import { ModuleHeader } from '../components/list/ModuleHeader';
import { SearchBox } from '../components/list/SearchBox';
import { CategoryFilter } from '../components/list/CategoryFilter';
import { DemoBadge } from '../components/list/DemoBadge';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { NoResults } from '../components/state/NoResults';

const MONTHS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 随笔：一条竖直的“余烬时间线”。
 * 年份是大号的罗马式数字，每篇随笔是一颗挂在时间线上的火星，
 * 旁边写着当时的心境与地点。偶数条目向右、奇数向左（宽屏时）。
 */
export function EssaysPage() {
  const world = worldByKey.essays;
  useDocumentTitle(world.module);
  const state = useAsync(() => listEssays(), [], peekEssays);
  const { query, category, setQuery, setCategory, clear } = useListQuery();

  const all = state.status === 'ready' ? state.data : [];
  const { categories, counts } = useMemo(() => categoryCounts(all), [all]);
  const shown = useMemo(() => filterItems(all, query, category, 'recent'), [all, query, category]);
  const years = useMemo(() => groupByYear(shown), [shown]);

  return (
    <main id="main" className="page" tabIndex={-1} data-hue={world.hue}>
      <ModuleHeader world={world} total={state.status === 'ready' ? all.length : undefined}>
        <DemoBadge />
      </ModuleHeader>

      <div className="toolbar">
        <SearchBox label={copy.placeholder.essays} placeholder={copy.placeholder.essays} currentQuery={query} onSubmit={setQuery} />
        <CategoryFilter categories={categories} counts={counts} active={category} onSelect={setCategory} />
      </div>

      {state.status === 'loading' && <div className="skeleton"><div className="skeleton__row" /><div className="skeleton__row" /><div className="skeleton__row" /></div>}
      {state.status === 'error' && <ErrorState onRetry={state.retry} />}
      {state.status === 'ready' && all.length === 0 && <EmptyState message={copy.empty.essays} />}
      {state.status === 'ready' && all.length > 0 && shown.length === 0 && <NoResults onClear={clear} />}

      {years.length > 0 && (
        <div className="ember-line">
          {years.map((g) => (
            <section key={g.year} className="ember-line__year" aria-label={`${g.year} 年`}>
              <h2 className="ember-line__y latin">{g.year}</h2>
              <ol className="ember-line__list" role="list">
                {g.items.map((e, i) => {
                  const d = (e.updated ?? e.date ?? '').slice(0, 10);
                  const m = Number(d.slice(5, 7));
                  return (
                    <li key={e.id} className="ember-line__item" style={{ ['--i' as string]: i } as CSSProperties}>
                      <span className="ember-line__spark" aria-hidden="true" />
                      <div className="ember-line__when">
                        <span className="ember-line__day mono">{d.slice(8, 10)}</span>
                        <span className="latin ember-line__mon">{MONTHS[m - 1] ?? ''}</span>
                      </div>
                      <Link to={`/essays/${encodeURIComponent(e.id)}`} className="ember-card lit">
                        <div className="ember-card__meta">
                          {e.category && <span className="tag">{e.category}</span>}
                          {e.mood && <span className="ember-card__mood">心境 · {e.mood}</span>}
                          {e.place && <span className="ember-card__place">@ {e.place}</span>}
                        </div>
                        <h3 className="ember-card__title display">{e.title}</h3>
                        <p className="ember-card__sum">{e.summary}</p>
                        {(e.tags?.length ?? 0) > 0 && (
                          <p className="ember-card__tags">
                            {e.tags!.map((t) => (
                              <span key={t}>#{t}</span>
                            ))}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {category === ALL && !query && <p className="ember-line__end">— 更早的念头，已经冷却成了星尘 —</p>}
        </div>
      )}
    </main>
  );
}
