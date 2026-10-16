/**
 * 全站语料：把三类公开内容合成统一条目，供首页、搜索面板、星图、轨迹共用。
 * 只使用 loader 里的列表接口（同一个数据出口），并缓存 Promise：复用至站长写入内容。
 * 写入后或失败时清除缓存，下次调用重新读取。
 */
import { listFiles, listNotes, listSummaries } from './loader';
import type { ContentType } from './types';
import { subscribeContentChanges } from './changes';

export interface Entry {
  kind: ContentType;
  id: string;
  title: string;
  summary: string;
  category?: string;
  tags: string[];
  /** 排序与轨迹使用：updated 优先，其次 date；文件使用 updatedAt */
  date?: string;
  to: string;
  /** 文件专用 */
  ext?: string;
  size?: number;
  fileKind?: string;
}

export interface Corpus {
  entries: Entry[];
  counts: Record<ContentType, number>;
  categories: string[];
  tags: { name: string; count: number }[];
  totalBytes: number;
}

let cache: Promise<Corpus> | null = null;
subscribeContentChanges(resetCorpus);

export function loadCorpus(): Promise<Corpus> {
  if (!cache) {
    const pending = build().catch((err) => {
      // 旧请求的失败不能清除写入后创建的新缓存。
      if (cache === pending) cache = null;
      throw err;
    });
    cache = pending;
  }
  return cache;
}

export function resetCorpus(): void {
  cache = null;
}

async function build(): Promise<Corpus> {
  const [notes, summaries, files] = await Promise.all([listNotes(), listSummaries(), listFiles()]);
  const entries: Entry[] = [
    ...notes.map<Entry>((n) => ({ kind: 'notes', id: n.id, title: n.title, summary: n.summary, category: n.category, tags: n.tags ?? [], date: n.updated ?? n.date, to: `/notes/${n.id}` })),
    ...summaries.map<Entry>((s) => ({ kind: 'summaries', id: s.id, title: s.title, summary: s.summary, category: s.category, tags: s.tags ?? [], date: s.updated ?? s.date, to: `/summaries/${s.id}` })),
    ...files.map<Entry>((f) => ({ kind: 'files', id: f.id, title: f.name, summary: f.description ?? '', tags: [], date: f.updatedAt, to: `/files/${f.id}`, ext: f.ext, size: f.size, fileKind: f.kind })),
  ];
  const tagCount = new Map<string, number>();
  const cats = new Set<string>();
  for (const e of entries) {
    if (e.category) cats.add(e.category);
    for (const t of e.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  return {
    entries,
    counts: { notes: notes.length, summaries: summaries.length, files: files.length },
    categories: [...cats],
    tags: [...tagCount.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh')),
    totalBytes: files.reduce((s, f) => s + (f.size || 0), 0),
  };
}

/** 搜索：标题、摘要、标签、分类，按命中位置加权 */
export function searchEntries(entries: Entry[], q: string, limit = 12): Entry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const parts = needle.split(/\s+/).filter(Boolean);
  const scored: { e: Entry; s: number }[] = [];
  for (const e of entries) {
    const title = e.title.toLowerCase();
    const sum = e.summary.toLowerCase();
    const tags = e.tags.join(' ').toLowerCase();
    const cat = (e.category ?? '').toLowerCase();
    let s = 0;
    let ok = true;
    for (const p of parts) {
      let ps = 0;
      if (title.startsWith(p)) ps += 8;
      else if (title.includes(p)) ps += 5;
      if (tags.includes(p)) ps += 4;
      if (cat.includes(p)) ps += 3;
      if (sum.includes(p)) ps += 2;
      if (ps === 0) {
        ok = false;
        break;
      }
      s += ps;
    }
    if (ok) scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s || (b.e.date ?? '').localeCompare(a.e.date ?? ''));
  return scored.slice(0, limit).map((x) => x.e);
}
