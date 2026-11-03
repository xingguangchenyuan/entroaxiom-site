/**
 * 后端 API 客户端（访客接口 /api/public/*）。完整契约见 docs/API.md。
 *
 * 约定：
 *  - 成功：{ success: true, data, error: null }；失败：{ success: false, data: null, error: { code, message, details? } }
 *  - 详情接口 404（不存在 / 私密 / 草稿）→ 返回 undefined，页面显示“未找到”
 *  - 列表接口 404 → 抛 ApiRequestError（code=ENDPOINT_NOT_FOUND）：列表要么有数据要么是空数组，
 *    404 只说明路由或反代没配对，不能伪装成“暂无内容”
 *  - 其他失败（网络、5xx、返回格式异常）→ 抛出 ApiRequestError（页面显示可重试的错误状态）
 *  - 后端用 null 表示“没有”，前端类型用 undefined，这里统一转换
 *  - 只使用同源 /api：生产由反向代理转发到后端，开发由 Vite 代理（见 vite.config.ts）
 */

import type {
  Essay,
  FileItem,
  FileKind,
  GuestDraft,
  GuestMessage,
  GuestPage,
  GuestReceipt,
  Note,
  ShelfItem,
  ShelfKind,
  ShelfStatus,
  SigilKey,
} from './types';

const TIMEOUT_MS = 15000;
export const API_BASE = '/api/public';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
}

async function request<T>(
  path: string,
  init?: { method?: 'GET' | 'POST'; body?: unknown; allow404?: boolean },
): Promise<T | undefined> {
  const controller = new AbortController();
  // 计时器覆盖「拿到响应头」和「读完响应体」两段：服务器吐完头之后卡住不发 body 也会按超时处理
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const method = init?.method ?? 'GET';
  let res: Response;
  let body: Envelope<T> | null = null;
  try {
    try {
      res = await fetch(path, {
        method,
        headers:
          method === 'GET'
            ? { Accept: 'application/json' }
            : { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'entroaxiom' },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } catch {
      throw new ApiRequestError(controller.signal.aborted ? '服务器响应超时' : '无法连接服务器', 0, controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR');
    }

    // 详情页的 404 表示“这条不存在 / 被设为私密”，是正常业务结果；
    // 列表接口的 404 只可能是路由或反向代理没配对，必须当成错误抛出去 ——
    // 否则页面会安静地显示“暂无内容”，把部署问题伪装成空站点。
    if (res.status === 404 && method === 'GET') {
      if (init?.allow404) return undefined;
      throw new ApiRequestError('接口不存在（404），请检查反向代理是否转发到后端', 404, 'ENDPOINT_NOT_FOUND');
    }

    try {
      body = (await res.json()) as Envelope<T>;
    } catch {
      // 读取中途被超时打断：和「非 JSON（例如网关错误页）」区分开
      if (controller.signal.aborted) throw new ApiRequestError('服务器响应超时', res.status, 'TIMEOUT');
    }
  } finally {
    window.clearTimeout(timer);
  }

  if (!res.ok || !body || body.success !== true || body.data === null) {
    throw new ApiRequestError(
      body?.error?.message ?? (res.status === 429 ? '提交太频繁了，稍后再试' : `请求失败（${res.status}）`),
      res.status,
      body?.error?.code ?? (res.status === 429 ? 'RATE_LIMITED' : 'BAD_RESPONSE'),
      body?.error?.details,
    );
  }
  return body.data;
}

/* ---- 后端返回形状 → 前端类型 ---- */

export interface WireContent {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  tags: string[] | null;
  date: string | null;
  updated: string | null;
  body?: string;
  mood?: string | null;
  place?: string | null;
}

export interface WireFile {
  id: string;
  name: string;
  ext: string;
  kind: string;
  size: number;
  updatedAt: string | null;
  /** 老字段：公开地址。私密文件必须为 null */
  src?: string | null;
  /** 新契约字段：与 src 等价，优先使用 */
  publicSrc?: string | null;
  /** 更明确的新契约字段：`publicUrl` / `visible` / `mime` / `status` */
  publicUrl?: string | null;
  visible?: boolean;
  visibility?: 'public' | 'private';
  mime?: string | null;
  status?: 'ready' | 'processing' | 'failed';
  createdAt?: string | null;
  description: string | null;
}

export interface WireShelf {
  id: string;
  kind: string;
  title: string;
  creator: string;
  year: number | null;
  rating: number | null;
  status: string;
  date: string | null;
  tags: string[] | null;
  quote: string | null;
  review: string | null;
  cover: string | null;
  /** 后台新契约：封面可直接使用的公开地址（私密或未发布时为 null） */
  coverUrl?: string | null;
  link: string | null;
}

export interface WireGuest {
  id: string;
  name: string;
  site: string | null;
  body: string;
  sigil: string | null;
  createdAt: string;
  reply: { body: string; createdAt: string } | null;
}

const FILE_KINDS: readonly FileKind[] = ['image', 'pdf', 'archive', 'doc', 'other'];
const SHELF_KINDS: readonly ShelfKind[] = ['book', 'film', 'music'];
const SHELF_STATUS: readonly ShelfStatus[] = ['done', 'doing', 'want'];
export const SIGILS: readonly SigilKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

const pick = <T extends string>(list: readonly T[], v: string | null | undefined, fallback: T): T =>
  v && (list as readonly string[]).includes(v) ? (v as T) : fallback;

export function toContent<T extends Note | Essay>(w: WireContent): T {
  const out: Essay = {
    id: w.id,
    title: w.title,
    summary: w.summary ?? '',
    category: w.category ?? undefined,
    tags: w.tags && w.tags.length > 0 ? w.tags : undefined,
    date: w.date ?? undefined,
    updated: w.updated ?? undefined,
    visibility: 'public', // 公开接口只会返回 public + published 的内容
    status: 'published',
    body: w.body ?? '',
  };
  if (w.mood) out.mood = w.mood;
  if (w.place) out.place = w.place;
  return out as T;
}

/**
 * 公开接口给的图片地址必须是能直接打开的 URL。
 *
 * `asset:<id>` 是编辑器内部的引用（指向需要鉴权的私密文件），前台既拿不到也不该去拿：
 * 一律当成“没有图”，由组件显示占位文案 —— 而不是让 <img> 发一个必然失败的请求，
 * 再把它当成“图片加载失败，请重试”去反复戳后端。
 */
export function resolvePublicUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value || value.startsWith('asset:')) return undefined;
  return value;
}

export function toFile(w: WireFile): FileItem {
  return {
    id: w.id,
    name: w.name,
    ext: w.ext,
    kind: pick(FILE_KINDS, w.kind, 'other'),
    size: w.size,
    updatedAt: w.updatedAt ?? undefined,
    // 后台先后用过 src / publicSrc / publicUrl 三种叫法，这里按优先级取第一个能用的
    src: resolvePublicUrl(w.publicUrl ?? w.publicSrc ?? w.src),
    description: w.description ?? undefined,
  };
}

export function toShelf(w: WireShelf): ShelfItem {
  const rating = typeof w.rating === 'number' && Number.isFinite(w.rating) ? Math.min(5, Math.max(0, w.rating)) : undefined;
  return {
    id: w.id,
    kind: pick(SHELF_KINDS, w.kind, 'book'),
    title: w.title,
    creator: w.creator ?? '',
    year: w.year ?? undefined,
    rating,
    status: pick(SHELF_STATUS, w.status, 'done'),
    date: w.date ?? undefined,
    tags: w.tags && w.tags.length ? w.tags : undefined,
    quote: w.quote ?? undefined,
    review: w.review ?? undefined,
    cover: resolvePublicUrl(w.coverUrl ?? w.cover),
    link: w.link ?? undefined,
  };
}

export function toGuest(w: WireGuest): GuestMessage {
  return {
    id: w.id,
    name: w.name,
    site: w.site ?? undefined,
    body: w.body,
    sigil: pick(SIGILS, w.sigil, 'moon'),
    createdAt: w.createdAt,
    reply: w.reply ?? undefined,
  };
}

const enc = encodeURIComponent;

/* ---- 对外接口（与 loader.ts 的 Source 同名） ---- */

export async function listEssays(): Promise<Essay[]> {
  return ((await request<WireContent[]>(`${API_BASE}/essays`)) ?? []).map((w) => toContent<Essay>(w));
}
export async function getEssay(id: string): Promise<Essay | undefined> {
  const w = await request<WireContent>(`${API_BASE}/essays/${enc(id)}`, { allow404: true });
  return w ? toContent<Essay>(w) : undefined;
}

export async function listNotes(): Promise<Note[]> {
  return ((await request<WireContent[]>(`${API_BASE}/notes`)) ?? []).map((w) => toContent<Note>(w));
}
export async function getNote(id: string): Promise<Note | undefined> {
  const w = await request<WireContent>(`${API_BASE}/notes/${enc(id)}`, { allow404: true });
  return w ? toContent<Note>(w) : undefined;
}

export async function listFiles(): Promise<FileItem[]> {
  return ((await request<WireFile[]>(`${API_BASE}/files`)) ?? []).map(toFile);
}
export async function getFile(id: string): Promise<FileItem | undefined> {
  const w = await request<WireFile>(`${API_BASE}/files/${enc(id)}`, { allow404: true });
  return w ? toFile(w) : undefined;
}

export async function listShelf(): Promise<ShelfItem[]> {
  return ((await request<WireShelf[]>(`${API_BASE}/shelf`)) ?? []).map(toShelf);
}
export async function getShelfItem(id: string): Promise<ShelfItem | undefined> {
  const w = await request<WireShelf>(`${API_BASE}/shelf/${enc(id)}`, { allow404: true });
  return w ? toShelf(w) : undefined;
}

export async function listGuestbook(offset = 0, limit = 20): Promise<GuestPage> {
  const page = await request<{ items: WireGuest[]; total: number }>(`${API_BASE}/guestbook?offset=${offset}&limit=${limit}`);
  return { items: (page?.items ?? []).map(toGuest), total: page?.total ?? 0 };
}

export async function postGuestbook(draft: GuestDraft): Promise<GuestReceipt> {
  const r = await request<GuestReceipt>(`${API_BASE}/guestbook`, { method: 'POST', body: draft });
  if (!r) throw new ApiRequestError('留言接口不存在', 404, 'NOT_FOUND');
  return r;
}
