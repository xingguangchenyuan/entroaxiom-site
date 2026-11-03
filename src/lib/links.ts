/**
 * 正文（Markdown）里链接的分类，决定用路由跳转、新窗口打开还是交给浏览器。
 */

/**
 * 前端路由的一级路径。只有落在这些路径下的站内链接才走 <Link>；
 * 其余同源路径（如 /uploads/xxx.pdf、/demo-assets/…）是静态文件或后端资源，
 * 交给浏览器直接打开，否则会被前端路由当成 404。
 * 与 App.tsx 的 <Routes> 保持一致。
 */
const ROUTE_ROOTS = new Set(['essays', 'notes', 'shelf', 'files', 'guestbook', 'atlas', 'axioms']);

export type LinkTarget =
  | { kind: 'internal'; to: string }
  | { kind: 'external' }
  | { kind: 'other' };

function internalTo(pathAndMore: string): LinkTarget {
  const path = pathAndMore.split(/[?#]/)[0];
  const root = path.split('/').filter(Boolean)[0];
  if (path === '/' || (root && ROUTE_ROOTS.has(root))) return { kind: 'internal', to: pathAndMore };
  return { kind: 'other' };
}

/**
 * @param href   Markdown 里写的链接地址
 * @param origin 当前站点 origin（window.location.origin）；传入后，指向本站的绝对地址也按站内链接处理
 */
export function classifyHref(href: string | undefined, origin?: string): LinkTarget {
  if (!href) return { kind: 'other' };
  const h = href.trim();
  if (!h || h.startsWith('#')) return { kind: 'other' };
  if (h.startsWith('//')) return { kind: 'external' };
  if (h.startsWith('/')) return internalTo(h);
  if (/^https?:\/\//i.test(h)) {
    if (origin) {
      try {
        const u = new URL(h);
        if (u.origin === origin) return internalTo(`${u.pathname}${u.search}${u.hash}`);
      } catch {
        /* 地址无法解析：按外链处理 */
      }
    }
    return { kind: 'external' };
  }
  // mailto:、tel:、相对路径等：不接管
  return { kind: 'other' };
}

/** 给图片地址追加重试参数；地址里已有查询串时用 &，并保留 #hash */
export function withRetryParam(src: string, nonce: number): string {
  if (nonce <= 0) return src;
  const hashAt = src.indexOf('#');
  const base = hashAt === -1 ? src : src.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : src.slice(hashAt);
  return `${base}${base.includes('?') ? '&' : '?'}retry=${nonce}${hash}`;
}
