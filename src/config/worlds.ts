export type WorldKey = 'earth' | 'venus' | 'mars';

/** Three abstract emblems adapted from the local WebPictures references. */
export const worlds: Record<WorldKey, {
  name: string;
  module: string;
  path: string;
  tag: string;
  description: string;
  symbol: string;
  motif: string;
}> = {
  earth: {
    name: 'ARCHIVE', module: '文件库', path: '/files', tag: '01 / ARCHIVE',
    description: '让散落的信息找到坐标。收藏、整理，重新发现每一份值得保存的资料。',
    symbol: '/media/sigils/archive.webp', motif: '◈',
  },
  venus: {
    name: 'OBSERVE', module: '学习笔记', path: '/notes', tag: '02 / OBSERVE',
    description: '记录每次观察与推演。在未知的边缘，把瞬间的灵感写成可追寻的轨迹。',
    symbol: '/media/sigils/notes.webp', motif: '✧',
  },
  mars: {
    name: 'SYNTHESIS', module: '文章总结', path: '/summaries', tag: '03 / SYNTHESIZE',
    description: '穿过纷繁的观点，留下清晰的结论。将阅读与思考凝结为自己的公理。',
    symbol: '/media/sigils/summaries.webp', motif: '⌛',
  },
};

export const worldOrder: WorldKey[] = ['earth', 'venus', 'mars'];
