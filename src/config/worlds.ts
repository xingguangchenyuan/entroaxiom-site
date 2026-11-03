/**
 * 星系里的五颗天体 = 网站的五个模块。
 * 颜色、轨道、天体名都从这里来；首页的星仪、导航的色点、背景星云的色调都读这张表。
 */

export type WorldKey = 'essays' | 'notes' | 'files' | 'shelf' | 'guestbook';
export type Hue = 'ember' | 'glacier' | 'sol' | 'nebula' | 'aurora';

export interface World {
  key: WorldKey;
  /** 模块中文名 */
  module: string;
  /** 拉丁铭文（Cinzel 小型大写） */
  latin: string;
  /** 这颗天体的名字 */
  body: string;
  path: string;
  motto: string;
  description: string;
  hue: Hue;
  /** 主色（与 tokens.css 中同名变量一致） */
  color: string;
  /** 星仪：轨道序号（0 最内）、公转周期（秒）、初始相位（弧度）、星体半径（px） */
  orbit: number;
  period: number;
  phase: number;
  size: number;
  /** 是否带行星环 */
  ring?: boolean;
  /** 背景星云色调（线性 RGB，给 shader 用） */
  tint: [number, number, number];
}

export const worlds: World[] = [
  {
    key: 'essays',
    module: '随笔',
    latin: 'Essays',
    body: '余烬',
    path: '/essays',
    motto: '写下来，火就不会立刻熄灭',
    description: '夜里的念头、路上的观察、偶尔的长信。没有体例，只有温度。',
    hue: 'ember',
    color: '#ef8456',
    orbit: 0,
    period: 46,
    phase: 0.6,
    size: 15,
    tint: [0.2, 0.07, 0.05],
  },
  {
    key: 'notes',
    module: '学习笔记',
    latin: 'Notes',
    body: '冰卫星',
    path: '/notes',
    motto: '观察先于理解',
    description: '数学、物理、计算机与一切让我停下来的知识。冷静、可检索、可推导。',
    hue: 'glacier',
    color: '#9fd6e0',
    orbit: 1,
    period: 70,
    phase: 2.5,
    size: 18,
    tint: [0.04, 0.12, 0.17],
  },
  {
    key: 'shelf',
    module: '书影音',
    latin: 'Shelf',
    body: '气态巨星',
    path: '/shelf',
    motto: '别人的星光，照亮我的夜',
    description: '读过的书、看过的电影、反复听的唱片。每一条都带着一句摘录。',
    hue: 'nebula',
    color: '#ab93ff',
    orbit: 2,
    period: 96,
    phase: 4.1,
    size: 22,
    ring: true,
    tint: [0.11, 0.06, 0.2],
  },
  {
    key: 'files',
    module: '文件库',
    latin: 'Archive',
    body: '陨石带',
    path: '/files',
    motto: '保存是对遗忘的抵抗',
    description: '资料、图片与附件。被好好放置过的东西，会更晚消散。',
    hue: 'sol',
    color: '#e9bd5e',
    orbit: 3,
    period: 128,
    phase: 5.6,
    size: 13,
    tint: [0.16, 0.11, 0.03],
  },
  {
    key: 'guestbook',
    module: '留言区',
    latin: 'Comets',
    body: '彗星',
    path: '/guestbook',
    motto: '来自远方的访客，留下一道尾迹',
    description: '路过的人留下的话。每一条都是一颗短暂经过的彗星。',
    hue: 'aurora',
    color: '#72e0b9',
    orbit: 4,
    period: 160,
    phase: 1.4,
    size: 10,
    tint: [0.03, 0.14, 0.11],
  },
];

export const worldByKey = Object.fromEntries(worlds.map((w) => [w.key, w])) as Record<WorldKey, World>;

/** 路由 → 天体（用于背景色调与导航） */
export function worldForPath(pathname: string): World | undefined {
  return worlds.find((w) => pathname === w.path || pathname.startsWith(`${w.path}/`));
}
