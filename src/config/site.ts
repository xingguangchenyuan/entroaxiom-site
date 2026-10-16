/* 站点名称、导航、标题模板与用户可见的中文文案集中于此 */

export const SITE_NAME = 'entroaxiom';
export const SITE_TAGLINE = '在无序的熵变中，确立世界的公理。';

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: '/', label: '首页', end: true },
  { to: '/notes', label: '学习笔记' },
  { to: '/summaries', label: '文章总结' },
  { to: '/files', label: '文件库' },
  { to: '/atlas', label: '星图' },
  { to: '/axioms', label: '公理' },
];

export const welcomeCopy = {
  title: '欢迎来到我的宇宙',
  sub: '在无序的熵变中，收藏灵感，记录思考，寻找属于自己的公理。',
  enter: '进入我的星图',
  hint: '按 Enter 进入',
  lines: ['万物趋向散乱', '而我们仍在整理'],
};

export const moduleTitles = {
  files: '文件库',
  notes: '学习笔记',
  summaries: '文章总结',
} as const;

export type ModuleKey = keyof typeof moduleTitles;

/** 页面标题模板：content('xxx') → 'xxx · entroaxiom' */
export function documentTitle(suffix?: string): string {
  return suffix ? `${suffix} · ${SITE_NAME}` : SITE_NAME;
}

/** 会话/滚动恢复的 storage 键 */
export const SESSION_ENTERED_KEY = 'entroaxiom:entered';
export const SCROLL_PREFIX = 'entroaxiom:scroll:';

export const copy = {
  skipToContent: '跳到主要内容',
  empty: {
    files: '这里还没有文件',
    notes: '还没有学习笔记',
    summaries: '还没有文章总结',
  },
  noResults: '没有匹配的结果',
  clearFilters: '清除筛选',
  loadFailed: '内容加载失败',
  retry: '重试',
  notFound: {
    title: '这里是视界之外',
    desc: '你访问的页面不存在，或已被移动。',
    backHome: '返回首页',
  },
  contentMissing: '内容不存在',
  contentMissingDesc: '这篇内容不存在，或者没有公开。',
  backToList: '返回列表',
  demoBadge: '演示内容',
  searchSubmit: '搜索',
  clearSearch: '清空搜索',
  placeholder: {
    files: '搜索文件',
    notes: '搜索学习笔记',
    summaries: '搜索文章总结',
  },
  previewUnsupported: '该文件类型暂不支持在线预览',
  pdfUnsupported: '当前浏览器无法预览该 PDF',
  download: '下载文件',
  imageFailed: '图片加载失败',
  close: '关闭',
  menu: { open: '打开菜单', close: '关闭菜单' },
  toc: { label: '目录', open: '打开目录', close: '关闭目录' },
  zoomAlt: '放大图片',
  errorBoundary: {
    title: '页面出错了',
    desc: '页面渲染出现异常，请返回首页重试。',
  },
} as const;
