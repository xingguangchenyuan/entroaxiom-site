/**
 * 公理页：像一副只有七张的塔罗。每张牌是一条“个人公理”，
 * 正面是符号与罗马数字，翻过来才是文字。站长可以直接改这里的文字。
 */
export interface Axiom {
  numeral: string;
  /** 牌名（Cinzel） */
  arcana: string;
  title: string;
  body: string;
  /** 反面的一句注脚 */
  gloss: string;
  /** 牌面符号 */
  glyph: 'eye' | 'ouroboros' | 'hourglass' | 'spiral' | 'key' | 'horizon' | 'star';
  color: string;
  to?: string;
  toLabel?: string;
}

export const axioms: Axiom[] = [
  {
    numeral: 'I',
    arcana: 'The Observer',
    title: '观察先于理解',
    body: '在下结论之前，先长久地看。大部分误解来自看得太少，而不是想得太少。',
    gloss: '星光抵达时，那颗星也许已经不在。',
    glyph: 'eye',
    color: '#9fd6e0',
    to: '/notes',
    toLabel: '去笔记里观察',
  },
  {
    numeral: 'II',
    arcana: 'The Archive',
    title: '保存是对遗忘的抵抗',
    body: '熵总会赢，但被好好整理过的东西，会消散得更慢一些。整理本身就是一种意义。',
    gloss: '每一个文件夹都是一座小小的方舟。',
    glyph: 'hourglass',
    color: '#e9bd5e',
    to: '/files',
    toLabel: '打开文件库',
  },
  {
    numeral: 'III',
    arcana: 'The Ember',
    title: '写下来，火就不会立刻熄灭',
    body: '念头是易逝的热量。把它写成句子，就是把热量存进一块石头里。',
    gloss: '余烬比火焰更持久。',
    glyph: 'spiral',
    color: '#ef8456',
    to: '/essays',
    toLabel: '读几篇随笔',
  },
  {
    numeral: 'IV',
    arcana: 'The Ouroboros',
    title: '一切系统都需要外部',
    body: '足够强的体系无法在自身内部证明自己的一致。所以要出门，要读别人的书。',
    gloss: '蛇咬住尾巴，也就看不见自己的头。',
    glyph: 'ouroboros',
    color: '#ab93ff',
    to: '/shelf',
    toLabel: '翻翻书影音',
  },
  {
    numeral: 'V',
    arcana: 'The Horizon',
    title: '边界之外仍有世界',
    body: '视界不是世界的尽头，只是信息无法返回的地方。承认不可知，是诚实的开始。',
    gloss: '黑洞并不黑，它只是不回信。',
    glyph: 'horizon',
    color: '#f2a7c3',
    to: '/atlas',
    toLabel: '走进星图',
  },
  {
    numeral: 'VI',
    arcana: 'The Key',
    title: '公理是选择，而不是发现',
    body: '我们无法证明起点，只能选择起点。选择之后，就要对它推出的一切负责。',
    gloss: '平行线可以相交，只要你愿意换一个宇宙。',
    glyph: 'key',
    color: '#e9bd5e',
  },
  {
    numeral: 'VII',
    arcana: 'The Comet',
    title: '相遇是短暂的轨道交叠',
    body: '大多数相遇只是一次掠过。但掠过也会改变轨道——哪怕只偏转了一角秒。',
    gloss: '欢迎你，远方的彗星。',
    glyph: 'star',
    color: '#72e0b9',
    to: '/guestbook',
    toLabel: '留下尾迹',
  },
];

export const preface = {
  title: '七张牌',
  paragraphs: [
    '这不是真理，只是我暂时选择相信的起点。',
    '像欧几里得那样，先写下不证自明的几条，然后在上面盖房子。',
    '点击一张牌，把它翻过来。',
  ],
};

export const horizon = {
  title: '第八条公理',
  text: '还在冰层下面。等它浮上来的时候，我会把它写在这里。',
};

export const closing = '被好好整理过的东西，消散得更慢。';
