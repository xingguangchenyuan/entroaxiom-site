/**
 * 演示内容数据源（仅 VITE_CONTENT_SOURCE=demo 时由 loader.ts 动态加载）
 *
 * 把 demo/ 目录下的 Markdown 与 demo/files.ts 包成与后端 API 相同形状的异步接口。
 * 正式构建（official）不会引用本文件，演示数据也不会进入产物。
 */

import { parseFrontmatter } from './frontmatter';
import type { FileItem, Frontmatter, Note, Summary } from './types';
import { demoFiles } from './demo/files';

/* 构建期把演示 Markdown 打进产物，无运行时网络请求 */
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
 * - 可见性规则与后端 /api/public/* 完全一致：只保留 visibility=public 且 status=published，
 *   其余（private、draft、缺省）一律过滤；页面上不出现任何私密提示
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

    if (data.visibility !== 'public' || data.status !== 'published') {
      warn(`${kind} 不是 public + published，已过滤（${id}）`);
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
      visibility: 'public',
      status: 'published',
    };

    entries.push({ ...(base as T), body } as ParsedEntry<T>);
  }
  return entries;
}

const notes = collect<Note>(demoNoteModules, 'note').sort(
  (a, b) => (b.updated ?? b.date ?? '').localeCompare(a.updated ?? a.date ?? ''),
);
const summaries = collect<Summary>(demoSummaryModules, 'summary').sort(
  (a, b) => (b.updated ?? b.date ?? '').localeCompare(a.updated ?? a.date ?? ''),
);
const files: FileItem[] = demoFiles;

const notesById = new Map(notes.map((n) => [n.id, n]));
const summariesById = new Map(summaries.map((s) => [s.id, s]));
const filesById = new Map(files.map((f) => [f.id, f]));

/* ---- 对外异步接口（与 api.ts 同名同形状） ---- */

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