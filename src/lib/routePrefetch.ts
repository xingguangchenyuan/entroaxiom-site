import type { ComponentType } from 'react';

/**
 * 路由分块表。
 *
 * 首页之外的所有页面都按需加载：入口只带外壳 + 首页，首屏不必为一篇可能永远不会打开的
 * 文章付 markdown/katex 的钱（约 135 KB gzip）。详情页会连带拉进 markdown + katex。
 *
 * 同一个表也用于悬停预取：import() 的模块级缓存由打包器保证只求值一次，
 * 因此重复调用只是复用一个已解决的 Promise，不会重复下载。
 */
type Chunk = () => Promise<{ default: ComponentType }>;

export const ROUTES = {
  essays: () => import('../pages/EssaysPage').then((m) => ({ default: m.EssaysPage })),
  essay: () => import('../pages/EssayDetailPage').then((m) => ({ default: m.EssayDetailPage })),
  notes: () => import('../pages/NotesPage').then((m) => ({ default: m.NotesPage })),
  note: () => import('../pages/NoteDetailPage').then((m) => ({ default: m.NoteDetailPage })),
  shelf: () => import('../pages/ShelfPage').then((m) => ({ default: m.ShelfPage })),
  files: () => import('../pages/FilesPage').then((m) => ({ default: m.FilesPage })),
  file: () => import('../pages/FileDetailPage').then((m) => ({ default: m.FileDetailPage })),
  guestbook: () => import('../pages/GuestbookPage').then((m) => ({ default: m.GuestbookPage })),
  atlas: () => import('../pages/AtlasPage').then((m) => ({ default: m.AtlasPage })),
  axioms: () => import('../pages/AxiomsPage').then((m) => ({ default: m.AxiomsPage })),
} satisfies Record<string, Chunk>;

/** 一级路径 → 列表页分块；带二级路径时 → 详情页分块 */
const LIST: Record<string, Chunk> = {
  essays: ROUTES.essays,
  notes: ROUTES.notes,
  files: ROUTES.files,
  shelf: ROUTES.shelf,
  guestbook: ROUTES.guestbook,
  atlas: ROUTES.atlas,
  axioms: ROUTES.axioms,
};
const DETAIL: Record<string, Chunk> = {
  essays: ROUTES.essay,
  notes: ROUTES.note,
  files: ROUTES.file,
};

const started = new Set<string>();

/**
 * 提前取好目标路由的代码块 —— 指针停在链接上、或键盘聚焦到链接时就发出请求，
 * 真的点下去时通常已经到货，跳转不再白等一个网络来回。
 */
export function prefetchRoute(to: string): void {
  const path = to.split(/[?#]/)[0] || '/';
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return;
  const [seg] = parts;
  const table = parts.length > 1 ? DETAIL : LIST;
  const chunk = table[seg];
  if (!chunk) return;
  const key = `${parts.length > 1 ? 'detail' : 'list'}:${seg}`;
  if (started.has(key)) return;
  started.add(key);
  // 预取失败无所谓：真正导航时 lazy() 会重新发起请求并走 Suspense
  void chunk().catch(() => started.delete(key));
}
