/**
 * 站点绝对地址相关的纯函数。vite.config.ts（构建时）和 App.tsx（运行时）共用，所以不能依赖 DOM。
 *
 * 域名通过环境变量 VITE_SITE_URL 配置（例如 https://example.com，只写协议 + 域名 + 可选端口）。
 * 正式构建缺了它会在 vite.config.ts 里直接中止（分享图不能"悄悄没有"）；
 * 只有开发服务器允许没有，此时 og:image / twitter:image 整组不输出。
 * canonical / og:url 在运行时回退到当前访问的 origin。
 */

/** index.html 里用来占位的记号；构建时被替换成 VITE_SITE_URL 或整行删除 */
export const SITE_URL_TOKEN = '__SITE_URL__';

/** 规范化配置的站点地址：只保留 origin；不是合法的 http(s) 地址时返回 undefined */
export function normalizeSiteUrl(raw: string | undefined | null): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

/** 某个路由路径对应的 canonical / og:url：去掉末尾斜杠，不含查询串和 hash */
export function canonicalUrl(origin: string, pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return new URL(clean, origin).href;
}

/**
 * 处理 index.html：
 *  - 有站点地址：把所有 __SITE_URL__ 替换成它；
 *  - 没有：只在开发服务器上会走到这里（正式构建缺它会直接报错中止）。
 *    这时把 og:image* / twitter:image* 整组删掉 —— 只删含占位符的那两行会留下
 *    og:image:width / height / alt 这些孤儿声明，抓取器会以为"声明了图却取不到"，比没有更糟。
 */
export function applySiteUrl(html: string, siteUrl: string | undefined): string {
  if (siteUrl) return html.split(SITE_URL_TOKEN).join(siteUrl);
  return html.replace(/^[ \t]*<meta\b[^\n]*(?:og:image|twitter:image)[^\n]*\n/gm, '');
}
