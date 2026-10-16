/**
 * 后端 API 客户端（访客只读接口 /api/public/*）
 *
 * 约定（与 entroaxiom-backend 一致）：
 *  - 成功：{ success: true, data, error: null }；失败：{ success: false, data: null, error: { code, message } }
 *  - 内容不存在 / 私密 / 草稿：统一 404 → 这里返回 undefined（页面显示“未找到”）
 *  - 其他失败（网络、5xx、返回格式异常）→ 抛出 ApiRequestError（页面显示可重试的错误状态）
 *  - 后端用 null 表示“没有”，前端类型用 undefined，这里统一转换
 */

import type { FileItem, FileKind, Note, Summary } from './types';

/*
 * 只使用同源 /api：生产由 Nginx 转发到 FastAPI，开发由 Vite 代理。
 * 跨域 API（另一个域名/端口）不是正式部署方案：后端没有 CORS 配置，且登录 Cookie 为 SameSite=Strict，
 * 所以这里刻意不提供可配置的 API 地址，避免配出一个跑不通的组合。
 */
const TIMEOUT_MS = 15000;

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

async function get<T>(path: string): Promise<T | undefined> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch {
    throw new ApiRequestError('无法连接服务器', 0, 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timer);
  }

  if (res.status === 404) return undefined;

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    /* 非 JSON（例如网关错误页） */
  }
  if (!res.ok || !body || body.success !== true || body.data === null) {
    throw new ApiRequestError(
      body?.error?.message ?? `请求失败（${res.status}）`,
      res.status,
      body?.error?.code ?? 'BAD_RESPONSE',
    );
  }
  return body.data;
}

/* ---- 后端返回形状 → 前端类型 ---- */

interface WireContent {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  tags: string[];
  date: string | null;
  updated: string | null;
  body?: string;
}

interface WireFile {
  id: string;
  name: string;
  ext: string;
  kind: string;
  size: number;
  updatedAt: string | null;
  src: string;
  description: string | null;
}

const FILE_KINDS: readonly FileKind[] = ['image', 'pdf', 'archive', 'doc', 'other'];

function toContent<T extends Note | Summary>(w: WireContent): T {
  return {
    id: w.id,
    title: w.title,
    summary: w.summary,
    category: w.category ?? undefined,
    tags: w.tags && w.tags.length > 0 ? w.tags : undefined,
    date: w.date ?? undefined,
    updated: w.updated ?? undefined,
    visibility: 'public', // 后端只会返回 public + published 的内容
    status: 'published',
    body: w.body ?? '',
  } as T;
}

function toFile(w: WireFile): FileItem {
  return {
    id: w.id,
    name: w.name,
    ext: w.ext,
    kind: (FILE_KINDS as readonly string[]).includes(w.kind) ? (w.kind as FileKind) : 'other',
    size: w.size,
    updatedAt: w.updatedAt ?? undefined,
    src: w.src,
    description: w.description ?? undefined,
  };
}

const enc = encodeURIComponent;

/* ---- 对外接口（与 loader.ts 同名） ---- */

export async function listNotes(): Promise<Note[]> {
  return ((await get<WireContent[]>('/api/public/notes')) ?? []).map((w) => toContent<Note>(w));
}

export async function getNote(id: string): Promise<Note | undefined> {
  const w = await get<WireContent>(`/api/public/notes/${enc(id)}`);
  return w ? toContent<Note>(w) : undefined;
}

export async function listSummaries(): Promise<Summary[]> {
  return ((await get<WireContent[]>('/api/public/summaries')) ?? []).map((w) => toContent<Summary>(w));
}

export async function getSummary(id: string): Promise<Summary | undefined> {
  const w = await get<WireContent>(`/api/public/summaries/${enc(id)}`);
  return w ? toContent<Summary>(w) : undefined;
}

export async function listFiles(): Promise<FileItem[]> {
  return ((await get<WireFile[]>('/api/public/files')) ?? []).map(toFile);
}

export async function getFile(id: string): Promise<FileItem | undefined> {
  const w = await get<WireFile>(`/api/public/files/${enc(id)}`);
  return w ? toFile(w) : undefined;
}
