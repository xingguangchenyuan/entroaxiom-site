import type { GuestDraft, SigilKey } from '../content/types';

/** 留言字段上限：前端校验与后端约定一致（docs/API.md） */
export const GUEST_LIMITS = { name: 24, body: 500, site: 200, email: 120, minBody: 2 } as const;

export type GuestField = 'name' | 'email' | 'site' | 'body';
export type GuestErrors = Partial<Record<GuestField, string>>;

export interface GuestForm {
  name: string;
  email: string;
  site: string;
  body: string;
  sigil: SigilKey;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 补全网址协议，非法时返回 null */
export function normalizeSite(raw: string): string | null {
  const v = raw.trim();
  if (!v) return '';
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/** 字符数按“用户感知的字”计（emoji 算一个） */
export const charCount = (s: string): number => Array.from(s).length;

export function validateGuest(form: GuestForm): { errors: GuestErrors; draft: GuestDraft | null } {
  const errors: GuestErrors = {};
  const name = form.name.trim().replace(/\s+/g, ' ');
  const body = form.body.trim();
  const email = form.email.trim();
  const site = normalizeSite(form.site);

  if (!name) errors.name = '写一个称呼，随便什么都行';
  else if (charCount(name) > GUEST_LIMITS.name) errors.name = `称呼最多 ${GUEST_LIMITS.name} 个字`;

  if (charCount(body) < GUEST_LIMITS.minBody) errors.body = '留言至少两个字';
  else if (charCount(body) > GUEST_LIMITS.body) errors.body = `留言最多 ${GUEST_LIMITS.body} 个字，现在是 ${charCount(body)}`;

  if (email && (!EMAIL.test(email) || email.length > GUEST_LIMITS.email)) errors.email = '邮箱格式不对；不想留可以空着';
  if (site === null || (site && site.length > GUEST_LIMITS.site)) errors.site = '网址格式不对，例如 example.com';

  if (Object.keys(errors).length) return { errors, draft: null };
  const draft: GuestDraft = { name, body, sigil: form.sigil };
  if (email) draft.email = email;
  if (site) draft.site = site;
  return { errors, draft };
}

/** 后端 422 的 details → 字段名（兼容 FastAPI 的 loc 数组与 "body.name" 字符串） */
export function validationField(details: unknown): GuestField | null {
  if (!Array.isArray(details) || details.length === 0) return null;
  const loc = (details[0] as { loc?: unknown })?.loc;
  const parts = Array.isArray(loc) ? loc.map(String) : typeof loc === 'string' ? loc.split('.') : [];
  // 第一段是位置（body / query），第二段才是字段名
  const rest = parts[0] === 'body' ? parts.slice(1) : parts;
  const field = rest.find((p) => ['name', 'email', 'site', 'body'].includes(p));
  return (field as GuestField | undefined) ?? null;
}
