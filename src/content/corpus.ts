import { listEssays, listFiles, listNotes, listShelf } from './loader';
import { subscribeContentChanges } from './changes';
import type { ContentType, FileKind, ShelfKind } from './types';

/**
 * 全站语料：把随笔、笔记、文件、书影音压成统一的条目，供首页、星图、搜索、漂流使用。
 * 只读一次并缓存；内容变化时（invalidateContent）丢弃缓存。
 */
export interface Entry {
  kind: ContentType;
  id: string;
  title: string;
  summary: string;
  category?: string;
  tags: string[];
  date?: string;
  to: string;
  ext?: string;
  size?: number;
  fileKind?: FileKind;
  shelfKind?: ShelfKind;
  rating?: number;
}

export interface Corpus {
  entries: Entry[];
  counts: Record<ContentType, number>;
  categories: string[];
  tags: { name: string; count: number }[];
  totalBytes: number;
  /** 最近一次更新的日期 */
  latest?: string;
}

const shelfLabel: Record<ShelfKind, string> = { book: '书', film: '影', music: '音' };

async function build(): Promise<Corpus> {
  const [essays, notes, files, shelf] = await Promise.all([listEssays(), listNotes(), listFiles(), listShelf()]);
  const entries: Entry[] = [
    ...essays.map<Entry>((e) => ({ kind: 'essays', id: e.id, title: e.title, summary: e.summary, category: e.category, tags: e.tags ?? [], date: e.updated ?? e.date, to: `/essays/${encodeURIComponent(e.id)}` })),
    ...notes.map<Entry>((n) => ({ kind: 'notes', id: n.id, title: n.title, summary: n.summary, category: n.category, tags: n.tags ?? [], date: n.updated ?? n.date, to: `/notes/${encodeURIComponent(n.id)}` })),
    ...files.map<Entry>((f) => ({ kind: 'files', id: f.id, title: f.name, summary: f.description ?? '', tags: [], date: f.updatedAt, to: `/files/${encodeURIComponent(f.id)}`, ext: f.ext, size: f.size, fileKind: f.kind })),
    ...shelf.map<Entry>((s) => ({ kind: 'shelf', id: s.id, title: s.title, summary: s.quote ?? s.creator, category: shelfLabel[s.kind], tags: s.tags ?? [], date: s.date, to: `/shelf?item=${encodeURIComponent(s.id)}`, shelfKind: s.kind, rating: s.rating })),
  ];

  const tagCount = new Map<string, number>();
  const cats = new Set<string>();
  for (const e of entries) {
    if (e.category && e.kind !== 'shelf') cats.add(e.category);
    for (const t of e.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const latest = entries.reduce<string | undefined>((m, e) => (e.date && (!m || e.date > m) ? e.date : m), undefined);
  return {
    entries,
    counts: { essays: essays.length, notes: notes.length, files: files.length, shelf: shelf.length },
    categories: [...cats].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    tags: [...tagCount].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')),
    totalBytes: files.reduce((s, f) => s + (f.size || 0), 0),
    latest,
  };
}

let cache: Promise<Corpus> | null = null;
let ready: Corpus | null = null;

export function loadCorpus(): Promise<Corpus> {
  if (!cache) {
    const p: Promise<Corpus> = build().then(
      (c) => {
        if (cache === p) ready = c; // 加载期间被 reset 过的话，这份结果不再算数
        return c;
      },
      (err: unknown) => {
        if (cache === p) cache = null;
        throw err;
      },
    );
    cache = p;
  }
  return cache;
}

/** 同步读取已加载好的语料；还没加载完（或已失效）返回 undefined。用来避免每次挂载都闪一帧 loading */
export function peekCorpus(): Corpus | undefined {
  return ready ?? undefined;
}

export function resetCorpus(): void {
  cache = null;
  ready = null;
}
subscribeContentChanges(resetCorpus);

/** 按最近日期排序 */
export const byRecent = (a: Entry, b: Entry): number => (b.date ?? '').localeCompare(a.date ?? '');

/** 简单加权搜索：标题 > 标签 > 分类 > 摘要 */
export function searchEntries(entries: Entry[], q: string, limit = 12): Entry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const scored: { e: Entry; s: number }[] = [];
  for (const e of entries) {
    const title = e.title.toLowerCase();
    let s = 0;
    if (title.startsWith(needle)) s += 8;
    else if (title.includes(needle)) s += 5;
    if (e.tags.some((t) => t.toLowerCase().includes(needle))) s += 4;
    if (e.category?.toLowerCase().includes(needle)) s += 3;
    if (e.summary.toLowerCase().includes(needle)) s += 2;
    if (s > 0) scored.push({ e, s });
  }
  return scored.sort((a, b) => b.s - a.s || byRecent(a.e, b.e)).slice(0, limit).map((x) => x.e);
}
