/**
 * 内容读取的统一接口（文档 §9.1，唯一数据出口）
 *
 * 本阶段内部是本地同步数据包成的 Promise；以后换成 fetch('/api/...') 时
 * 只需要改这一个文件。页面一律通过 listNotes/getNote 等异步接口取数。
 *
 * 内容来源由构建期环境变量 VITE_CONTENT_SOURCE 决定：
 *  - official（默认）：正式内容（notes/summaries 正式目录 + files.ts）
 *  - demo：演示内容（demo/ 目录），页面显示「演示内容」标注
 * 不做运行时 URL 参数切换。
 */

import { parseFrontmatter } from './frontmatter';
import type { FileItem, Frontmatter, Note, Summary } from './types';
import { officialFiles } from './files';
import { demoFiles } from './demo/files';

export const CONTENT_SOURCE: 'official' | 'demo' =
  import.meta.env.VITE_CONTENT_SOURCE === 'demo' ? 'demo' : 'official';

/** 页面据此显示「演示内容」标注 */
export const isDemo = CONTENT_SOURCE === 'demo';

/* 构建期把 Markdown 全部打进产物，无运行时网络请求 */
const noteModules = import.meta.glob('./notes/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const summaryModules = import.meta.glob('./summaries/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const demoNoteModules = import.meta.glob('./demo/notes/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const demoSummaryModules = import.meta.glob('./demo/summaries/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ENABLE_VISIBILITY_FILTER = true; // 本阶段只加载 public

function warn(msg: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[entroaxiom] ${msg}`);
  }
}

type ParsedEntry<T extends Frontmatter> = T & { body: string };

/**
 * 解析并校验单篇内容：
 * - frontmatter 缺 id/title → 开发环境警告并跳过，生产环境跳过（不使整页崩溃）
 * - id 重复 → 警告并跳过后者（保持先到先得）
 * - visibility 非 public → 在加载层过滤，页面上不出现任何私密提示
 */
function collect<T extends Frontmatter>(
  modules: Record<string, string>,
  kind: 'note' | 'summary',
): ParsedEntry<T>[] {
  const entries: ParsedEntry<T>[] = [];
  const seen = new Set<string>();
  const paths = Object.keys(modules).sort();

  for (const path of paths) {
    const { data, body } = parseFrontmatter(modules[path]);

    if (typeof data.id !== 'string' || !data.id.trim() || typeof data.title !== 'string' || !data.title.trim()) {
      warn(`${kind} 文件缺失 id 或 title，已跳过：${path}`);
      continue;
    }
    const id = data.id.trim();
    if (seen.has(id)) {
      warn(`${kind} 的 id 重复（${id}），已跳过：${path}`);
      continue;
    }
    seen.add(id);

    if (ENABLE_VISIBILITY_FILTER && data.visibility === 'private') {
      warn(`${kind} 为私密内容，本阶段过滤（${id}）`);
      continue;
    }

    const base: Frontmatter = {
      id,
      title: String(data.title),
      summary: typeof data.summary === 'string' ? (data.summary as string) : '',
      category: typeof data.category === 'string' ? data.category : undefined,
      tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : undefined,
      date: typeof data.date === 'string' ? data.date : undefined,
      updated: typeof data.updated === 'string' ? data.updated : undefined,
      visibility: data.visibility === 'private' ? 'private' : 'public',
    };

    entries.push({ ...(base as T), body } as ParsedEntry<T>);
  }
  return entries;
}

const notes = collect<Note>(isDemo ? demoNoteModules : noteModules, 'note').sort(
  (a, b) => (b.updated ?? b.date ?? '').localeCompare(a.updated ?? a.date ?? ''),
);
const summaries = collect<Summary>(isDemo ? demoSummaryModules : summaryModules, 'summary').sort(
  (a, b) => (b.updated ?? b.date ?? '').localeCompare(a.updated ?? a.date ?? ''),
);
const files: FileItem[] = isDemo ? demoFiles : officialFiles;

const notesById = new Map(notes.map((n) => [n.id, n]));
const summariesById = new Map(summaries.map((s) => [s.id, s]));
const filesById = new Map(files.map((f) => [f.id, f]));

/* ---- 对外异步接口（本地数据包成 Promise，未来替换为 fetch） ---- */

export function listNotes(): Promise<Note[]> {
  return Promise.resolve(notes.map(({ body: _body, ...rest }) => rest as Note));
}

export function getNote(id: string): Promise<Note | undefined> {
  const n = notesById.get(id);
  return Promise.resolve(n ? ({ ...n } as Note) : undefined);
}

export function listSummaries(): Promise<Summary[]> {
  return Promise.resolve(summaries.map(({ body: _body, ...rest }) => rest as Summary));
}

export function getSummary(id: string): Promise<Summary | undefined> {
  const s = summariesById.get(id);
  return Promise.resolve(s ? ({ ...s } as Summary) : undefined);
}

export function listFiles(): Promise<FileItem[]> {
  return Promise.resolve(files);
}

export function getFile(id: string): Promise<FileItem | undefined> {
  return Promise.resolve(filesById.get(id));
}