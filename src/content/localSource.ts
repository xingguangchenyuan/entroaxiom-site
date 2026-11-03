/**
 * 演示内容数据源（仅 VITE_CONTENT_SOURCE=demo 时由 loader.ts 动态加载）
 *
 * 把 demo/ 目录下的 Markdown 与 TS 数据包成与后端 API 相同形状的异步接口。
 * 留言区：种子留言 + 本机提交的留言（localStorage，标记为「待审核」只对本机可见）。
 * 正式构建（official）不会引用本文件，演示数据也不会进入产物。
 */

import { parseFrontmatter } from './frontmatter';
import type { Essay, FileItem, Frontmatter, GuestDraft, GuestMessage, GuestPage, GuestReceipt, Note, ShelfItem } from './types';
import { demoFiles } from './demo/files';
import { demoShelf } from './demo/shelf';
import { demoGuestbook } from './demo/guestbook';

/* 构建期把演示 Markdown 打进产物，无运行时网络请求 */
const demoNoteModules = import.meta.glob('./demo/notes/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const demoEssayModules = import.meta.glob('./demo/essays/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function warn(msg: string): void {
  if (import.meta.env.DEV) console.warn(`[entroaxiom] ${msg}`);
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/**
 * 解析并校验单篇内容：缺 id/title 跳过；id 重复跳过后者；
 * 可见性规则与公开接口一致：只保留 visibility=public 且 status=published。
 */
function collect<T extends Frontmatter & { body: string }>(modules: Record<string, string>, kind: string): T[] {
  const entries: T[] = [];
  const seen = new Set<string>();
  for (const path of Object.keys(modules).sort()) {
    const { data, body } = parseFrontmatter(modules[path]);
    const id = str(data.id);
    const title = str(data.title);
    if (!id || !title) {
      warn(`${kind} 文件缺失 id 或 title，已跳过：${path}`);
      continue;
    }
    if (seen.has(id)) {
      warn(`${kind} 的 id 重复（${id}），已跳过：${path}`);
      continue;
    }
    seen.add(id);
    if (data.visibility !== 'public' || data.status !== 'published') continue;
    const item: Frontmatter & { body: string; mood?: string; place?: string } = {
      id,
      title,
      summary: str(data.summary) ?? '',
      category: str(data.category),
      tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : undefined,
      date: str(data.date),
      updated: str(data.updated),
      visibility: 'public',
      status: 'published',
      body,
    };
    const mood = str(data.mood);
    const place = str(data.place);
    if (mood) item.mood = mood;
    if (place) item.place = place;
    entries.push(item as T);
  }
  return entries.sort((a, b) => (b.updated ?? b.date ?? '').localeCompare(a.updated ?? a.date ?? ''));
}

const notes = collect<Note>(demoNoteModules, 'note');
const essays = collect<Essay>(demoEssayModules, 'essay');
const notesById = new Map(notes.map((n) => [n.id, n]));
const essaysById = new Map(essays.map((n) => [n.id, n]));
const filesById = new Map(demoFiles.map((f) => [f.id, f]));
const shelfById = new Map(demoShelf.map((s) => [s.id, s]));

const strip = <T extends { body: string }>({ body: _b, ...rest }: T) => ({ ...rest, body: '' }) as T;
const later = <T,>(v: T, ms = 120): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));

/* ---- 对外异步接口（与 api.ts 同名同形状） ---- */

export const listEssays = (): Promise<Essay[]> => later(essays.map(strip));
export const getEssay = (id: string): Promise<Essay | undefined> => later(essaysById.get(id));
export const listNotes = (): Promise<Note[]> => later(notes.map(strip));
export const getNote = (id: string): Promise<Note | undefined> => later(notesById.get(id));
export const listFiles = (): Promise<FileItem[]> => later(demoFiles);
export const getFile = (id: string): Promise<FileItem | undefined> => later(filesById.get(id));
export const listShelf = (): Promise<ShelfItem[]> => later(demoShelf);
export const getShelfItem = (id: string): Promise<ShelfItem | undefined> => later(shelfById.get(id));

/* ---- 留言（本机） ---- */

const LOCAL_KEY = 'entroaxiom:demo-guestbook';

function readLocal(): GuestMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as GuestMessage[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function listGuestbook(offset = 0, limit = 20): Promise<GuestPage> {
  const all = [...readLocal(), ...demoGuestbook].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return later({ items: all.slice(offset, offset + limit), total: all.length }, 260);
}

export async function postGuestbook(draft: GuestDraft): Promise<GuestReceipt> {
  const createdAt = new Date().toISOString();
  const msg: GuestMessage = {
    id: `local-${Date.now().toString(36)}`,
    name: draft.name,
    site: draft.site,
    body: draft.body,
    sigil: draft.sigil,
    createdAt,
    pending: true,
  };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([msg, ...readLocal()].slice(0, 50)));
  } catch {
    /* 隐私模式：只在本次会话里显示 */
  }
  return later({ id: msg.id, status: 'pending', createdAt }, 600);
}
