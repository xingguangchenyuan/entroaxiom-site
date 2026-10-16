import type { Entry } from '../../content/corpus';

/**
 * 星图布局：把内容与“枢纽”（分类、重复出现的标签、文件类型）画成力导向图。
 *  - 枢纽 = 星座的名字；内容 = 星星。同一个标签/分类下的内容会聚在同一枢纽周围
 *  - 只出现一次的标签不建枢纽（否则全是孤立的小点）
 *  - 种子固定：同样的数据永远得到同样的布局，刷新不会“跳”
 */

export type HubType = 'cat' | 'tag' | 'fkind';

export interface GNode {
  id: string;
  type: 'entry' | HubType;
  label: string;
  entry?: Entry;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  deg: number;
  phase: number;
  /** 标签是否有足够空间显示（避免文字互相重叠） */
  showLabel: boolean;
}
export interface GEdge {
  a: number;
  b: number;
}
export interface Graph {
  nodes: GNode[];
  edges: GEdge[];
  /** 节点 → 相邻节点下标 */
  adj: number[][];
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FILE_KIND_LABEL: Record<string, string> = { image: '图片', pdf: 'PDF', archive: '压缩包', doc: '文档', other: '其他' };

export function buildGraph(entries: Entry[], W: number, H: number): Graph {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const index = new Map<string, number>();
  const seed = hash(entries.map((e) => e.kind + e.id).join('|') + `${W}x${H}`);
  const rand = rng(seed);

  const tagCount = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);

  const add = (id: string, type: GNode['type'], label: string, r: number, entry?: Entry): number => {
    const hit = index.get(id);
    if (hit !== undefined) return hit;
    const ang = rand() * Math.PI * 2;
    const rad = 0.15 + rand() * 0.8;
    const i = nodes.length;
    nodes.push({ id, type, label, entry, r, x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, vx: 0, vy: 0, deg: 0, phase: rand(), showLabel: true });
    index.set(id, i);
    return i;
  };
  const link = (a: number, b: number) => {
    edges.push({ a, b });
    nodes[a].deg++;
    nodes[b].deg++;
  };

  for (const e of entries) {
    const ei = add(`${e.kind}:${e.id}`, 'entry', e.title, 5.5, e);
    if (e.category) link(ei, add(`cat:${e.category}`, 'cat', e.category, 8));
    for (const t of e.tags) if ((tagCount.get(t) ?? 0) >= 2) link(ei, add(`tag:${t}`, 'tag', t, 5));
    if (e.kind === 'files' && e.fileKind) link(ei, add(`fk:${e.fileKind}`, 'fkind', FILE_KIND_LABEL[e.fileKind] ?? '其他', 7));
  }
  // 节点大小随连接数增长，一眼看出“重要的星”
  for (const n of nodes) if (n.type === 'entry') n.r = 5 + Math.min(3.5, n.deg * 0.8);

  const N = nodes.length;
  const adj: number[][] = nodes.map(() => []);
  for (const { a, b } of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  if (N === 0) return { nodes, edges, adj };

  // 力导向（Fruchterman–Reingold，归一化坐标 [-1,1]，x 轴按画布宽高比拉伸）
  const aspect = W / H;
  const k = Math.sqrt((4 * aspect) / Math.max(1, N)) * 1.15;
  const iters = N > 300 ? 90 : 240;
  let temp = 0.22;
  for (let it = 0; it < iters; it++) {
    for (const n of nodes) {
      n.vx = 0;
      n.vy = 0;
    }
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = (nodes[i].x - nodes[j].x) / aspect;
        let dy = nodes[i].y - nodes[j].y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) {
          dx = (rand() - 0.5) * 0.01;
          dy = (rand() - 0.5) * 0.01;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const f = (k * k) / d;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        nodes[i].vx += fx * aspect;
        nodes[i].vy += fy;
        nodes[j].vx -= fx * aspect;
        nodes[j].vy -= fy;
      }
    }
    for (const { a, b } of edges) {
      const dx = (nodes[a].x - nodes[b].x) / aspect;
      const dy = nodes[a].y - nodes[b].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-3;
      const f = (d * d) / k;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      nodes[a].vx -= fx * aspect;
      nodes[a].vy -= fy;
      nodes[b].vx += fx * aspect;
      nodes[b].vy += fy;
    }
    for (const n of nodes) {
      // 向心力：孤立的星不会被推到画布外
      n.vx -= n.x * 0.35 * k;
      n.vy -= n.y * 0.35 * k;
      const mag = Math.sqrt(n.vx * n.vx + n.vy * n.vy) || 1e-3;
      const lim = Math.min(mag, temp);
      n.x += (n.vx / mag) * lim;
      n.y += (n.vy / mag) * lim;
    }
    temp *= 0.985;
  }

  // 归一化到画布：用分位数取边界，个别离群点不会把整幅图压成一团；最后夹回安全边距内
  const sortedX = nodes.map((n) => n.x).sort((a, b) => a - b);
  const sortedY = nodes.map((n) => n.y).sort((a, b) => a - b);
  const pick = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))))];
  const lo = N > 12 ? 0.05 : 0;
  const minX = pick(sortedX, lo), maxX = pick(sortedX, 1 - lo);
  const minY = pick(sortedY, lo), maxY = pick(sortedY, 1 - lo);
  const padX = Math.min(110, W * 0.11);
  const padY = Math.min(64, H * 0.11);
  const sx = (W - padX * 2) / Math.max(1e-3, maxX - minX);
  const sy = (H - padY * 2) / Math.max(1e-3, maxY - minY);
  const cxm = (minX + maxX) / 2;
  const cym = (minY + maxY) / 2;
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  for (const n of nodes) {
    n.x = clamp(W / 2 + (n.x - cxm) * sx, padX * 0.5, W - padX * 0.5);
    n.y = clamp(H / 2 + (n.y - cym) * sy, padY * 0.6, H - padY * 0.4);
  }

  // 像素空间里的最小间距：把挤在一起的点轻轻推开
  const minGap = (a: GNode, b: GNode) => (a.type !== 'entry' || b.type !== 'entry' ? 44 : 26);
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        const g = minGap(a, b);
        if (d >= g) continue;
        if (d < 0.01) { dx = rand() - 0.5; dy = rand() - 0.5; d = Math.sqrt(dx * dx + dy * dy); }
        const push = (g - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }
    for (const n of nodes) {
      n.x = clamp(n.x, padX * 0.5, W - padX * 0.5);
      n.y = clamp(n.y, padY * 0.6, H - padY * 0.4);
    }
  }

  // 标签避让：分类优先，其次文件类型，再次标签；与已放置的标签重叠就先不显示（悬停时仍有提示）
  const fontOf = (t: GNode['type']) => (t === 'cat' ? 16 : t === 'tag' ? 12.5 : 15);
  const hubs = nodes.filter((n) => n.type !== 'entry').sort((a, b) => (a.type === 'cat' ? 0 : a.type === 'fkind' ? 1 : 2) - (b.type === 'cat' ? 0 : b.type === 'fkind' ? 1 : 2) || b.deg - a.deg);
  const boxes: [number, number, number, number][] = [];
  for (const h of hubs) {
    const fs = fontOf(h.type);
    let w = 0;
    for (const ch of h.label) w += /[\u3400-\u9fff]/.test(ch) ? fs * 1.06 : fs * 0.58;
    const cx = h.x, cy = h.y - (h.r + 11);
    const box: [number, number, number, number] = [cx - w / 2 - 4, cy - fs, cx + w / 2 + 4, cy + 5];
    const hit = boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
    if (hit) h.showLabel = false;
    else boxes.push(box);
  }
  return { nodes, edges, adj };
}
