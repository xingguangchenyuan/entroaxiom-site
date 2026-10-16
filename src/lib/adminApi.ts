/**
 * 站长端 API 客户端：/api/auth/* 与 /api/admin/*（同源，Cookie 会话）。
 *
 * 与后端约定一致：
 *  - 统一信封 { success, data, error: { code, message, details } }
 *  - 未登录 401 UNAUTHORIZED；写请求需要同源 Origin（浏览器同源 fetch/XHR 自动携带）
 *  - 登录限流 429 TOO_MANY_ATTEMPTS，Retry-After 秒数
 * 访客页面不会使用本文件。
 */

import { invalidateContent } from '../content/changes';

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;
  readonly details?: unknown;
  constructor(message: string, status: number, code: string, retryAfter?: number, details?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

/* ---- 类型：与 entroaxiom-backend 的 schemas/admin.py 一一对应 ---- */

export type Visibility = 'public' | 'private';
export type Status = 'draft' | 'published';

export interface AdminContentItem {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  tags: string[];
  date: string | null;
  updated: string | null;
  visibility: Visibility;
  status: Status;
  created_at: string;
  updated_at: string;
}
export interface AdminContent extends AdminContentItem {
  body: string;
}
export interface AdminFile {
  id: string;
  name: string;
  ext: string;
  kind: string;
  size: number;
  mime_type: string;
  sha256: string;
  description: string | null;
  visibility: Visibility;
  status: Status;
  date: string | null;
  exposed: boolean;
  src: string;
  created_at: string;
  updated_at: string;
}

export interface ContentCreate {
  id?: string;
  title: string;
  summary?: string;
  category?: string | null;
  tags?: string[];
  body?: string;
  date?: string | null;
  updated?: string | null;
  visibility?: Visibility;
  status?: Status;
}
export type ContentUpdate = Partial<ContentCreate>;
export interface FileUpdate {
  id?: string;
  name?: string;
  description?: string;
  visibility?: Visibility;
  status?: Status;
  date?: string | null;
}

export type ContentModule = 'notes' | 'summaries';

/* ---- 底层 ---- */

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
}

let unauthorizedHandler: (() => void) | null = null;
/** AuthProvider 注册：任何接口返回 401 时，把前端登录态切回未登录 */
export function onUnauthorized(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

const TIMEOUT_MS = 20000;

function parseRetry(h: string | null): number | undefined {
  if (!h) return undefined;
  const n = Number(h);
  return Number.isFinite(n) ? n : undefined;
}

/** 同时兼容后端现有点分路径和标准数组路径（含 tags.0 等嵌套字段）。 */
export function validationField(details: unknown): string | null {
  if (!Array.isArray(details)) return null;
  const loc: unknown = details[0]?.loc;
  const parts = typeof loc === 'string' ? loc.split('.') : Array.isArray(loc) ? loc.map(String) : [];
  if (['body', 'query', 'path', 'header', 'cookie'].includes(parts[0])) parts.shift();
  return parts.find((part) => part.length > 0 && !/^\d+$/.test(part)) ?? null;
}

function toError(status: number, body: Envelope<unknown> | null, retryAfter?: number): AdminApiError {
  const code = body?.error?.code ?? 'BAD_RESPONSE';
  let message = body?.error?.message ?? `请求失败（${status}）`;
  if (code === 'VALIDATION_ERROR' && Array.isArray(body?.error?.details)) {
    const first = (body!.error!.details as { msg?: string }[])[0];
    const field = validationField(body?.error?.details);
    if (first?.msg) message = `${field ? field + '：' : ''}${first.msg}`;
  }
  const err = new AdminApiError(message, status, code, retryAfter, body?.error?.details);
  if (status === 401 && code === 'UNAUTHORIZED') unauthorizedHandler?.();
  return err;
}

async function call<T>(method: string, path: string, json?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new AdminApiError('无法连接服务器', 0, 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timer);
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    /* 非 JSON */
  }
  if (!res.ok || !body || body.success !== true) throw toError(res.status, body, parseRetry(res.headers.get('Retry-After')));
  if (method !== 'GET' && path.startsWith('/api/admin/')) invalidateContent();
  return body.data as T;
}

/** 后端每页最多 500 条；自动读取后续页，搜索、图片选择与统计都使用完整集合。 */
async function listAll<T extends { id: string }>(path: string, params: URLSearchParams): Promise<T[]> {
  const all = new Map<string, T>();
  const limit = 500;
  params.set('limit', String(limit));
  for (let offset = 0; ; offset += limit) {
    params.set('offset', String(offset));
    const page = await call<T[]>('GET', `${path}?${params.toString()}`);
    page.forEach((item) => all.set(item.id, item));
    if (page.length < limit) return [...all.values()];
  }
}

const enc = encodeURIComponent;

/* ---- 认证 ---- */

export const auth = {
  me: () => call<{ authenticated: boolean }>('GET', '/api/auth/me'),
  login: (password: string) => call<{ authenticated: boolean }>('POST', '/api/auth/login', { password }),
  logout: () => call<{ authenticated: boolean }>('POST', '/api/auth/logout'),
};

/* ---- 笔记 / 总结 ---- */

export const content = {
  list: (m: ContentModule, params: { q?: string; status?: Status; visibility?: Visibility } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.status) sp.set('status', params.status);
    if (params.visibility) sp.set('visibility', params.visibility);
    return listAll<AdminContentItem>(`/api/admin/${m}`, sp);
  },
  get: (m: ContentModule, id: string) => call<AdminContent>('GET', `/api/admin/${m}/${enc(id)}`),
  create: (m: ContentModule, data: ContentCreate) => call<AdminContent>('POST', `/api/admin/${m}`, data),
  update: (m: ContentModule, id: string, data: ContentUpdate) => call<AdminContent>('PATCH', `/api/admin/${m}/${enc(id)}`, data),
  remove: (m: ContentModule, id: string) => call<{ deleted: string }>('DELETE', `/api/admin/${m}/${enc(id)}`),
};

/* ---- 文件 ---- */

export const files = {
  list: (params: { q?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    return listAll<AdminFile>('/api/admin/files', sp);
  },
  update: (id: string, data: FileUpdate) => call<AdminFile>('PATCH', `/api/admin/files/${enc(id)}`, data),
  remove: (id: string) => call<{ deleted: string }>('DELETE', `/api/admin/files/${enc(id)}`),
  contentUrl: (id: string, download = false) => `/api/admin/files/${enc(id)}/content${download ? '?download=true' : ''}`,
  /** multipart 上传；用 XHR 才能拿到上传进度 */
  upload(file: File, opts: { id?: string; description?: string; visibility?: Visibility; status?: Status }, onProgress?: (ratio: number) => void): { promise: Promise<AdminFile>; abort: () => void } {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<AdminFile>((resolve, reject) => {
      const form = new FormData();
      form.append('file', file, file.name);
      if (opts.id) form.append('id', opts.id);
      if (opts.description) form.append('description', opts.description);
      form.append('visibility', opts.visibility ?? 'private');
      form.append('status', opts.status ?? 'published');
      xhr.open('POST', '/api/admin/files');
      xhr.withCredentials = true;
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onerror = () => reject(new AdminApiError('无法连接服务器', 0, 'NETWORK_ERROR'));
      xhr.onabort = () => reject(new AdminApiError('已取消上传', 0, 'ABORTED'));
      xhr.ontimeout = () => reject(new AdminApiError('上传超时', 0, 'TIMEOUT'));
      xhr.onload = () => {
        let body: Envelope<AdminFile> | null = null;
        try {
          body = JSON.parse(xhr.responseText) as Envelope<AdminFile>;
        } catch {
          /* 非 JSON（例如网关的 413 页面） */
        }
        if (xhr.status >= 200 && xhr.status < 300 && body?.success && body.data) {
          invalidateContent();
          resolve(body.data);
        }
        else if (xhr.status === 413 && !body) reject(new AdminApiError('文件过大，超过服务器限制', 413, 'FILE_TOO_LARGE'));
        else reject(toError(xhr.status, body));
      };
      xhr.send(form);
    });
    return { promise, abort: () => xhr.abort() };
  },
};
