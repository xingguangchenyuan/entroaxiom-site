import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { copy } from '../config/site';
import { worldByKey } from '../config/worlds';
import { listNotes, peekNotes } from '../content/loader';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useListQuery, type SortKey } from '../hooks/useListQuery';
import { categoryCounts, filterItems } from '../lib/listFilter';
import { ModuleHeader } from '../components/list/ModuleHeader';
import { SearchBox } from '../components/list/SearchBox';
import { CategoryFilter } from '../components/list/CategoryFilter';
import { DemoBadge } from '../components/list/DemoBadge';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { NoResults } from '../components/state/NoResults';

/**
 * 学习笔记：冰卫星的“观测卡片墙”。
 * 每张卡片左上角是分类的“晶格”编号，右下角是标签；悬停时卡片泛起冰蓝的冷光。
 * 列表/网格两种视图（?view=list）。
 */
export function NotesPage() {
  const world = worldByKey.notes;
  useDocumentTitle(world.module);
  const state = useAsync(() => listNotes(), [], peekNotes);
  const { query, category, sort, setQuery, setCategory, setSort, clear } = useListQuery();

  const all = state.status === 'ready' ? state.data : [];
  const { categories, counts } = useMemo(() => categoryCounts(all), [all]);
  const shown = useMemo(() => filterItems(all, query, category, sort), [all, query, category, sort]);
  const catIndex = useMemo(() => Object.fromEntries(categories.map((c, i) => [c, i])), [categories]);

  return (
    <main id="main" className="page" tabIndex={-1} data-hue={world.hue}>
      <ModuleHeader world={world} total={state.status === 'ready' ? all.length : undefined} unit="条">
        <DemoBadge />
      </ModuleHeader>

      <div className="toolbar">
        <SearchBox label={copy.placeholder.notes} placeholder={copy.placeholder.notes} currentQuery={query} onSubmit={setQuery} />
        <Segmented<SortKey>
          label="排序"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'recent', label: '最近' },
            { value: 'title', label: '标题' },
          ]}
        />
      </div>
      <CategoryFilter categories={categories} counts={counts} active={category} onSelect={setCategory} />

      {state.status === 'loading' && <div className="skeleton"><div className="skeleton__row" /><div className="skeleton__row" /></div>}
      {state.status === 'error' && <ErrorState onRetry={state.retry} />}
      {state.status === 'ready' && all.length === 0 && <EmptyState message={copy.empty.notes} />}
      {state.status === 'ready' && all.length > 0 && shown.length === 0 && <NoResults onClear={clear} />}

      {shown.length > 0 && (
        <ul className="frost-grid" role="list">
          {shown.map((n, i) => (
            <li key={n.id} style={{ ['--i' as string]: i } as React.CSSProperties}>
              <Link to={`/notes/${encodeURIComponent(n.id)}`} className="frost-card lit">
                <span className="frost-card__lattice mono" aria-hidden="true">
                  {n.category ? `${String.fromCharCode(945 + (catIndex[n.category] ?? 0))}-${String(i + 1).padStart(2, '0')}` : `ν-${i + 1}`}
                </span>
                <span className="frost-card__cat">{n.category ?? '未分类'}</span>
                <h2 className="frost-card__title">{n.title}</h2>
                <p className="frost-card__sum">{n.summary}</p>
                <div className="frost-card__foot">
                  <span className="readout">{(n.updated ?? n.date ?? '').slice(0, 10)}</span>
                  <span className="frost-card__tags">
                    {(n.tags ?? []).slice(0, 3).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
