/* 站点名称、导航、标题模板与用户可见的中文文案集中于此 */

export const SITE_NAME = 'entroaxiom';
export const SITE_TAGLINE = '在无序的熵变中，确立世界的公理。';

export interface NavItem {
  to: string;
  label: string;
  latin: string;
  end?: boolean;
  /** 对应天体色（worlds.ts 的 color），无则用金色 */
  color?: string;
}

export const navItems: NavItem[] = [
  { to: '/', label: '星仪', latin: 'Orrery', end: true },
  { to: '/essays', label: '随笔', latin: 'Essays', color: '#ef8456' },
  { to: '/notes', label: '笔记', latin: 'Notes', color: '#9fd6e0' },
  { to: '/shelf', label: '书影音', latin: 'Shelf', color: '#ab93ff' },
  { to: '/files', label: '文件库', latin: 'Archive', color: '#e9bd5e' },
  { to: '/guestbook', label: '留言', latin: 'Comets', color: '#72e0b9' },
  { to: '/atlas', label: '星图', latin: 'Atlas' },
  { to: '/axioms', label: '公理', latin: 'Axioms' },
];

export const welcomeCopy = {
  title: '欢迎来到我的宇宙',
  sub: '万物趋向散乱，而我在这里收藏灵感、记录思考，寻找属于自己的公理。',
  enter: '越过视界',
  lines: ['ENTROPY · AXIOM', '熵 · 公理'],
};

export const moduleTitles = {
  essays: '随笔',
  notes: '学习笔记',
  files: '文件库',
  shelf: '书影音',
  guestbook: '留言区',
} as const;

export type ModuleKey = keyof typeof moduleTitles;

/** 页面标题模板：documentTitle('xxx') → 'xxx · entroaxiom' */
export function documentTitle(suffix?: string): string {
  return suffix ? `${suffix} · ${SITE_NAME}` : SITE_NAME;
}

/** 会话/滚动恢复的 storage 键 */
export const SESSION_ENTERED_KEY = 'entroaxiom:entered';
export const SCROLL_PREFIX = 'entroaxiom:scroll:';

export const copy = {
  skipToContent: '跳到主要内容',
  empty: {
    essays: '还没有随笔',
    notes: '还没有学习笔记',
    files: '这里还没有文件',
    shelf: '书架还是空的',
    guestbook: '还没有人留下尾迹，做第一颗彗星吧',
  },
  noResults: '没有匹配的结果',
  clearFilters: '清除筛选',
  loadFailed: '内容加载失败',
  retry: '重试',
  notFound: {
    title: '这里是视界之外',
    desc: '你寻找的天体不存在，或已经坠入了黑洞。',
    backHome: '返回星仪',
  },
  contentMissing: '内容不存在',
  contentMissingDesc: '这篇内容不存在，或者没有公开。',
  backToList: '返回列表',
  demoBadge: '演示内容',
  searchSubmit: '搜索',
  clearSearch: '清空搜索',
  placeholder: {
    essays: '搜索随笔',
    notes: '搜索学习笔记',
    files: '搜索文件',
    shelf: '搜索书名、作者、导演、音乐人',
    guestbook: '',
  },
  previewUnsupported: '该文件类型暂不支持在线预览',
  pdfUnsupported: '当前浏览器无法预览该 PDF',
  download: '下载文件',
  imageFailed: '图片加载失败',
  /**
   * 正文里还留着 `asset:<id>` 这种编辑器内部引用时显示这段文案。
   * 它指向需要登录才能取的私密文件，前台永远拿不到 —— 给“重试”按钮只会白点。
   */
  imagePrivate: '这张图片未公开，暂不显示',
  close: '关闭',
  menu: { open: '打开菜单', close: '关闭菜单' },
  toc: { label: '目录', open: '打开目录', close: '关闭目录' },
  zoomAlt: '放大图片',
  errorBoundary: {
    title: '页面出错了',
    desc: '页面渲染出现异常，请返回首页重试。',
  },
} as const;
