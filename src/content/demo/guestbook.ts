import type { GuestMessage } from '../types';

/** 演示用留言（已审核的公开留言） */
export const demoGuestbook: GuestMessage[] = [
  {
    id: 'g-001',
    name: '远日点',
    site: 'https://example.com',
    body: '首页那个黑洞在我的旧笔记本上居然跑得动，风扇转得像发射场。很喜欢“保存是对遗忘的抵抗”这句话。',
    sigil: 'saturn',
    createdAt: '2026-10-21T22:13:00+08:00',
    reply: { body: '风扇声就当作是引擎点火吧。谢谢你来。', createdAt: '2026-10-22T09:02:00+08:00' },
  },
  {
    id: 'g-002',
    name: 'Mira',
    body: '读完《房间的熵》，今天把桌上的一本书放回了书架。只一本。',
    sigil: 'venus',
    createdAt: '2026-10-18T23:40:00+08:00',
    reply: { body: '我们站在同一边。', createdAt: '2026-10-19T08:15:00+08:00' },
  },
  {
    id: 'g-003',
    name: '半个物理系学生',
    body: '熵与信息那篇笔记里，香农熵和玻尔兹曼熵的类比讲得很清楚。可以再写一篇麦克斯韦妖和兰道尔原理吗？',
    sigil: 'mercury',
    createdAt: '2026-10-12T15:26:00+08:00',
  },
  {
    id: 'g-004',
    name: '路过的猫',
    body: '喵。（在星图里迷路了十分钟，很开心）',
    sigil: 'moon',
    createdAt: '2026-10-05T01:08:00+08:00',
    reply: { body: '迷路是星图的正确用法。', createdAt: '2026-10-05T10:30:00+08:00' },
  },
  {
    id: 'g-005',
    name: 'K.',
    site: 'https://example.org',
    body: '书影音里的《飞向太空》也是我最爱的塔可夫斯基。“我们需要镜子”——这句话我抄在了笔记本第一页。',
    sigil: 'mars',
    createdAt: '2026-09-27T20:51:00+08:00',
  },
  {
    id: 'g-006',
    name: '凌晨四点',
    body: '同样失眠，同样看见猎户座。原来不止我一个。',
    sigil: 'sun',
    createdAt: '2026-09-29T04:21:00+08:00',
  },
  {
    id: 'g-007',
    name: '木卫二',
    body: '公理页的三张牌翻起来很有仪式感。希望以后能多一张。',
    sigil: 'jupiter',
    createdAt: '2026-09-16T12:00:00+08:00',
    reply: { body: '第四条公理还在冰层下面，等它浮上来。', createdAt: '2026-09-16T18:44:00+08:00' },
  },
];
