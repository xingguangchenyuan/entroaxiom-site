import type { ContentType } from '../content/types';

/** 三个主模块：入口卡片、首页“轨道”、公理页共用 */
export interface World {
  key: ContentType;
  module: string;
  path: string;
  /** 一句话的哲学注脚 */
  motto: string;
  description: string;
  symbol: string;
  /** 主题色（对应 tokens 里的颜色变量） */
  tone: 'frost' | 'gold' | 'moss';
}

export const worlds: World[] = [
  {
    key: 'notes',
    module: '学习笔记',
    path: '/notes',
    motto: '观察先于理解',
    description: '把读到的、想到的、试出来的，如实记下来。笔记是还没长成结论的思考。',
    symbol: '/media/sigils/notes.webp',
    tone: 'frost',
  },
  {
    key: 'summaries',
    module: '文章总结',
    path: '/summaries',
    motto: '压缩即理解',
    description: '穿过纷繁的观点，留下清晰的结论。能说短，才算说清。',
    symbol: '/media/sigils/summaries.webp',
    tone: 'gold',
  },
  {
    key: 'files',
    module: '文件库',
    path: '/files',
    motto: '保存是对遗忘的抵抗',
    description: '让散落的资料有一个固定的坐标。图片、PDF、压缩包，都能被找到。',
    symbol: '/media/sigils/archive.webp',
    tone: 'moss',
  },
];

export const worldByKey: Record<ContentType, World> = {
  notes: worlds[0],
  summaries: worlds[1],
  files: worlds[2],
};
