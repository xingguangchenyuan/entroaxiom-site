import { useMemo } from 'react';
import { listNotes, listSummaries } from '../../content/loader';
import type { Note, Summary } from '../../content/types';
import { moduleTitles, copy } from '../../config/site';
import { worldByKey } from '../../config/worlds';
import { ALL, useListQuery, type SortKey } from '../../hooks/useListQuery';
import { useAsync } from '../../hooks/useAsync';
import { dateKey } from '../../lib/format';
import { SearchBox } from './SearchBox';
import { CategoryFilter } from './CategoryFilter';
import { ListItem } from './ListItem';
import { ModuleHeader } from './ModuleHeader';
import { Segmented } from '../ui/Segmented';
import { EmptyState } from '../state/EmptyState';
import { NoResults } from '../state/NoResults';
import { ErrorState } from '../state/ErrorState';

type Kind = 'notes' | 'summaries';
type Row = Note | Summary;

export function matchRow(row: Row, q: string, cat: string): boolean {
  const text = [row.title, row.summary, row.category ?? '', ...(row.tags ?? [])].join(' ').toLowerCase();
  return (q === '' || text.includes(q)) && (cat === ALL || row.category === cat);
}

function sortRows(rows: Row[], sort: SortKey): Row[] {
  const out = [...rows];
  if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  else out.sort((a, b) => dateKey(b.updated, b.date).localeCompare(dateKey(a.updated, a.date)));
  return out;
}

/**
 * 笔记/总结列表页共用骨架
 *  - 搜索词 / 分类 / 排序写在 URL（q / cat / sort），前进后退可恢复；
 *  - 分类由内容自动汇总；加载中、空、无结果、失败四种状态分开处理。
 */
export function ModuleList({ kind }: { kind: Kind }) {
  const title = moduleTitles[kind];
  const world = worldByKey[kind];
  const { query, category, sort, setQuery, setCategory, setSort, clear } = useListQuery();
  const state = useAsync<Row[]>(() => (kind === 'notes' ? listNotes() : listSummaries()), [kind]);
  const rows = state.status === 'ready' ? state.data : null;

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows?.forEach((r) => r.category && set.add(r.category));
    return [ALL, ...Array.from(set)];
  }, [rows]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: rows?.length ?? 0 };
    rows?.forEach((r) => r.category && (c[r.category] = (c[r.category] ?? 0) + 1));
    return c;
  }, [rows]);

  const q = query.toLowerCase();
  const filtered = useMemo(() => (rows ? sortRows(rows.filter((r) => matchRow(r, q, category)), sort) : []), [rows, q, category, sort]);

  if (state.status === 'error') {
    return (
      <main id="main" className="page" tabIndex={-1}>
        <ModuleHeader title={title} lead={world.motto} />
        <ErrorState onRetry={state.retry} />
      </main>
    );
  }

  return (
    <main id="main" className="page" tabIndex={-1}>
      <ModuleHeader title={title} lead={`${world.motto}。${world.description}`} total={rows?.length} />

      {rows === null ? (
        <div className="list-skeleton" aria-busy="true" aria-label="正在加载">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton--card" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message={copy.empty[kind]} hint="有内容公开后，会出现在这里。" />
      ) : (
        <>
          <div className="toolbar">
            <SearchBox label={copy.placeholder[kind]} placeholder={copy.placeholder[kind]} currentQuery={query} onSubmit={setQuery} />
            <Segmented<SortKey> label="排序方式" value={sort} onChange={setSort} options={[{ value: 'recent', label: '最近更新' }, { value: 'title', label: '标题' }]} />
          </div>
          {categories.length > 1 && <CategoryFilter categories={categories} counts={counts} active={category} onSelect={setCategory} />}
          {filtered.length === 0 ? (
            <NoResults onClear={clear} />
          ) : (
            <div className="list-panel glass glass--flat">
              <ul className="list" aria-label={`${title}列表，共 ${filtered.length} 项`}>
                {filtered.map((row) => (
                  <ListItem key={row.id} to={`/${kind}/${row.id}`} title={row.title} summary={row.summary} category={row.category} tags={row.tags} updated={row.updated} date={row.date} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
