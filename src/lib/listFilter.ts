import type { Frontmatter } from '../content/types';
import { ALL, type SortKey } from '../hooks/useListQuery';
import { dateKey } from './format';

/** 列表筛选：关键词（标题/摘要/标签/分类）+ 分类 + 排序。纯函数，便于测试 */
export function filterItems<T extends Frontmatter>(items: T[], query: string, category: string, sort: SortKey): T[] {
  const q = query.trim().toLowerCase();
  const out = items.filter((it) => {
    if (category !== ALL && it.category !== category) return false;
    if (!q) return true;
    return (
      it.title.toLowerCase().includes(q) ||
      it.summary.toLowerCase().includes(q) ||
      (it.category ?? '').toLowerCase().includes(q) ||
      (it.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });
  return out.sort((a, b) =>
    sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : dateKey(b.updated, b.date).localeCompare(dateKey(a.updated, a.date)),
  );
}

export function categoryCounts<T extends { category?: string }>(items: T[]): { categories: string[]; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const it of items) if (it.category) counts[it.category] = (counts[it.category] ?? 0) + 1;
  return { categories: Object.keys(counts).sort((a, b) => a.localeCompare(b, 'zh-CN')), counts };
}

/** 按年份分组（保持输入顺序） */
export function groupByYear<T extends Frontmatter>(items: T[]): { year: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const y = (dateKey(it.updated, it.date) || '????').slice(0, 4);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(it);
  }
  return [...map].map(([year, list]) => ({ year, items: list }));
}
