import { useEffect, useMemo, useState } from 'react';
import { listNotes, listSummaries } from '../../content/loader';
import type { Note, Summary } from '../../content/types';
import { moduleTitles, copy } from '../../config/site';
import { useListQuery } from '../../hooks/useListQuery';
import { SearchBox } from './SearchBox';
import { CategoryFilter } from './CategoryFilter';
import { ListItem } from './ListItem';
import { DemoBadge } from './DemoBadge';
import { EmptyState } from '../state/EmptyState';
import { NoResults } from '../state/NoResults';
import { ErrorState } from '../state/ErrorState';

type Kind = 'notes' | 'summaries';
type Row = (Note | Summary) & { id: string };

function match(row: Row, q: string, cat: string): boolean {
  const text = [row.title, row.summary, ...(row.tags ?? [])].join(' ').toLowerCase();
  const inText = q === '' || text.includes(q);
  const inCat = cat === '全部' || row.category === cat;
  return inText && inCat;
}

/**
 * 笔记/总结列表页共用骨架（设计文档 §8、§10）
 * - 搜索词与分类写在 URL（q/cat），回车/点击提交，前进后退可恢复；
 * - 分类由内容自动汇总；三个状态（空/无结果/失败）分开处理。
 */
export function ModuleList({ kind }: { kind: Kind }) {
  const title = moduleTitles[kind];
  const { query, category, setQuery, setCategory, clear } = useListQuery();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = kind === 'notes' ? listNotes : listSummaries;
    load()
      .then((list) => setRows(list as Row[]))
      .catch(() => setError(true));
  }, [kind]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows?.forEach((r) => r.category && set.add(r.category));
    return ['全部', ...Array.from(set)];
  }, [rows]);

  const q = query.toLowerCase();
  const filtered = useMemo(
    () => (rows ? rows.filter((r) => match(r, q, category)) : []),
    [rows, q, category],
  );

  if (error) return <ErrorState />;
  if (rows === null) {
    return (
      <div className="state-loading" role="status">
        <span className="state-loading-bar" />
      </div>
    );
  }

  return (
    <>
      <div className="module-header">
        <h1 className="module-title">{title}</h1>
        <DemoBadge />
        <div className="module-header-right">
          <SearchBox
            label={copy.placeholder[kind]}
            placeholder={copy.placeholder[kind]}
            currentQuery={query}
            onSubmit={setQuery}
          />
        </div>
      </div>

      {categories.length > 1 && (
        <CategoryFilter categories={categories} active={category} onSelect={setCategory} />
      )}

      {filtered.length === 0 && rows.length > 0 ? (
        <NoResults onClear={clear} />
      ) : filtered.length === 0 ? (
        <EmptyState message={copy.empty[kind]} />
      ) : (
        <ul className="module-list">
          {filtered.map((row) => (
            <ListItem
              key={row.id}
              href={`/${kind}/${row.id}`}
              title={row.title}
              summary={row.summary}
              category={row.category}
              updated={row.updated}
              date={row.date}
            />
          ))}
        </ul>
      )}
    </>
  );
}