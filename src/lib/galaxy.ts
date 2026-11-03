import { CoreGlow } from './coreGlow';
import { worlds, type World, type WorldKey } from '../config/worlds';

/**
 * 星系引擎：一颗星核 + 五条共面椭圆轨道上的行星。
 *
 * 只用 canvas 2D，分两层：
 *  - 静态层（离屏画布，只在尺寸变化时重画）：深蓝黑径向底、远景星尘、颗粒噪点；
 *  - 动态层（逐帧）：轨道底线与尾迹弧、轨道尘粒、行星、彗星、涟漪。
 * 行星与光晕都是预渲染的小精灵，逐帧只做 drawImage + 旋转，不重建渐变。
 *
 * 投影：所有轨道躺同一个倾斜平面上（倾角 TILT，压扁比 SQUASH），
 * 于是轨道被压成椭圆、行星沿椭圆滑动；sinθ > 0 的那半圈离观者更近（在星核前）。
 */

export type RGB = [number, number, number];

export interface LabelFrame {
  key: WorldKey;
  /** 标签锚点（舞台坐标，css px） */
  x: number;
  y: number;
  /** 1 = 向右展开，-1 = 向左展开 */
  side: 1 | -1;
  alpha: number;
  active: boolean;
  dimmed: boolean;
}

export interface GalaxyOptions {
  reduced: boolean;
  mobile: boolean;
  onLabels?: (frames: LabelFrame[]) => void;
}

/* ---------- 常量 ---------- */

/** 轨道倾角：与中心星盘一致 */
const TILT = -0.32;
/** 压扁比 */
const SQUASH = 0.6;
/** 五条轨道的半径比（内 → 外） */
const RATIOS = [1, 1.35, 1.8, 2.4, 3.2];
/** 轨道序号 → 模块（内 → 外），按内容分量排：留言最少在最内，文件最多在最外 */
const ORDER: WorldKey[] = ['guestbook', 'essays', 'notes', 'shelf', 'files'];
/** 行星基准直径（px，按画布等比缩放） */
const BASE_SIZE: Record<WorldKey, number> = { files: 16, shelf: 14, notes: 12, essays: 11, guestbook: 9 };
/** 公转周期基准（秒，最内圈）；其余按开普勒第三定律 T ∝ R^1.5 */
const PERIOD_BASE = 34;
/** 无交互时的帧间隔（30fps），以及指针离开后继续保持满帧率的时长 */
const IDLE_FRAME_MS = 1000 / 30;
const INTERACT_HOLD_MS = 1500;

/* ---------- 颜色工具 ---------- */

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

/** 降低饱和度：k=1 变灰，k=0 不变 */
function desat(c: RGB, k: number): RGB {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l, k)];
}

/** 拉平明度到目标亮度附近（保留一点原色相） */
function level(c: RGB, target: number): RGB {
  const l = Math.max(1, 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]);
  const k = target / l;
  return [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)];
}

/** 朝黑（t<0）或朝白（t>0）混合 */
function shade(c: RGB, t: number): RGB {
  const to = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  return [lerp(c[0], to, k), lerp(c[1], to, k), lerp(c[2], to, k)];
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  return cv;
}

/* ---------- 运行时结构 ---------- */

interface Planet {
  w: World;
  key: WorldKey;
  color: RGB;
  /** 轨道线颜色：降饱和、拉平明度 */
  line: RGB;
  /** 行星本体精灵的直径（设备像素） */
  spriteSize: number;
  sprite: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  ring: boolean;
  moon: boolean;
  /** 轨道半径（css px） */
  R: number;
  /** 公转周期（秒） */
  period: number;
  /** 参数角（弧度） */
  theta: number;
  /** 呼吸相位 */
  phase: number;
  /** 涟漪提亮 0..1 */
  flash: number;
  /** 当前帧位置 */
  x: number;
  y: number;
  depth: number;
  radius: number;
  alpha: number;
}

interface Ripple {
  r: number;
  t: number;
}

export class Galaxy {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: GalaxyOptions;

  /** 舞台边长（css px） */
  private S = 520;
  private dpr = 1;
  private cx = 260;
  private cy = 260;

  private planets: Planet[] = [];
  /** 最外轨道半径 */
  private rOuter = 180;
  /** 星核盘半径（涟漪起点、彗星「靠近星核」的判定用） */
  private coreR = 56;
  /** 星核图案半径：整张 800×800 星核图的一半，星盘占其中 85%、四角星耀斑伸到约 1.4 倍 */
  private coreHalf = 76;
  private core: CoreGlow | null = null;

  private staticLayer: HTMLCanvasElement | null = null;
  private staticSize = 0;
  private staticDpr = 0;

  private raf = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private introT = 0;
  private introDone = false;

  /** 指针视差（-1..1） */
  private px = 0;
  private py = 0;
  private pxTarget = 0;
  private pyTarget = 0;

  private hovered: WorldKey | null = null;
  /** 最近一次指针活动的时间（performance.now），用来判断是否在交互 */
  private pointerAt = -Infinity;
  private ripples: Ripple[] = [];
  private nextRipple = 5.6;

  /** 彗星 */
  private cometNu = 0.9;
  private cometR = 150;
  private cometA = 1;
  private cometE = 0.4;


  /** 标签最终位置（避让之后），引线与 DOM 都用这一份 */
  private labelPos = new Map<WorldKey, { x: number; y: number; side: 1 | -1 }>();

  private grain: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement, opts: GalaxyOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d unavailable');
    this.ctx = ctx;
    this.opts = opts;
    this.buildPlanets();
  }

  /* ---------- 构建 ---------- */

  private buildPlanets(): void {
    const byKey = new Map(worlds.map((w) => [w.key, w]));
    this.planets = ORDER.map((key, i) => {
      const w = byKey.get(key) as World;
      const color = hexToRgb(w.color);
      return {
        w,
        key,
        color,
        line: level(desat(color, 0.5), 168),
        spriteSize: 0,
        sprite: makeCanvas(1, 1),
        glow: makeCanvas(1, 1),
        ring: key === 'shelf',
        moon: key === 'shelf' || key === 'notes',
        R: 0,
        period: PERIOD_BASE * Math.pow(RATIOS[i], 1.5),
        theta: w.phase,
        phase: (i * 1.7) % (Math.PI * 2),
        flash: 0,
        x: 0,
        y: 0,
        depth: 0,
        radius: 8,
        alpha: 1,
      };
    });
  }

  /** 尺寸变化时调用：重算几何、重建精灵与静态层 */
  resize(cssSize: number, dpr: number): void {
    const S = Math.max(160, Math.round(cssSize));
    const d = clamp(dpr, 1, 2);
    if (S === this.S && d === this.dpr) return;
    this.S = S;
    this.dpr = d;
    this.cx = S / 2;
    this.cy = S / 2;
    this.canvas.width = Math.round(S * d);
    this.canvas.height = Math.round(S * d);
    this.canvas.style.width = `${S}px`;
    this.canvas.style.height = `${S}px`;

    // 最外轨道占舞台的 0.38（原 0.335）：标签的避让逻辑会把放不下的标签挪到别的方向，所以放大后仍不越界
    this.rOuter = S * 0.38;
    const r0 = this.rOuter / RATIOS[RATIOS.length - 1];
    this.coreR = r0 * 1.06;
    // 星盘半径约 1.15 倍最内圈轨道：最里面那颗行星在星盘外缘公转，耀斑则越过前两条轨道
    this.coreHalf = r0 * 1.35;
    // 基准直径按舞台缩放（以 520 为设计尺寸）
    const scale = S / 520;
    for (let i = 0; i < this.planets.length; i += 1) {
      const p = this.planets[i];
      p.R = r0 * RATIOS[i];
      p.radius = (BASE_SIZE[p.key] * scale) / 2;
      this.buildSprites(p, scale);
    }
    this.cometA = r0 * 2.25;
    this.cometE = 0.4;
    this.buildGrain();
    this.buildStatic();
  }

  private buildSprites(p: Planet, scale: number): void {
    const d = this.dpr;
    const r = p.radius;
    const box = Math.ceil(r * 2 * d + 8);
    const sprite = makeCanvas(box, box);
    const sx = box / 2;
    const sr = r * d;

    const c = sprite.getContext('2d');
    if (c) {
      // 受中心光源照射：光从左边来（绘制时整体旋转，让亮面朝向星核）
      const g = c.createRadialGradient(sx - sr * 0.42, sx - sr * 0.2, sr * 0.06, sx, sx, sr * 1.04);
      g.addColorStop(0, rgba(shade(p.color, 0.82), 1));
      g.addColorStop(0.34, rgba(shade(p.color, 0.12), 1));
      g.addColorStop(0.72, rgba(shade(p.color, -0.42), 1));
      g.addColorStop(1, rgba(shade(p.color, -0.74), 1));
      c.fillStyle = g;
      c.beginPath();
      c.arc(sx, sx, sr, 0, Math.PI * 2);
      c.fill();

      // 边缘光：贴边一圈淡淡的亮环
      const rim = c.createRadialGradient(sx, sx, sr * 0.72, sx, sx, sr);
      rim.addColorStop(0, 'rgba(0,0,0,0)');
      rim.addColorStop(0.82, rgba(shade(p.color, 0.5), 0.16));
      rim.addColorStop(1, rgba(shade(p.color, 0.72), 0.42));
      c.fillStyle = rim;
      c.beginPath();
      c.arc(sx, sx, sr, 0, Math.PI * 2);
      c.fill();

      // 亮面高光
      const hi = c.createRadialGradient(sx - sr * 0.52, sx - sr * 0.3, 0, sx - sr * 0.52, sx - sr * 0.3, sr * 0.55);
      hi.addColorStop(0, 'rgba(255,255,255,0.5)');
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hi;
      c.beginPath();
      c.arc(sx, sx, sr, 0, Math.PI * 2);
      c.fill();
    }
    p.sprite = sprite;
    p.spriteSize = box;

    // 呼吸光晕
    const gbox = Math.ceil(r * 9 * d);
    const glow = makeCanvas(gbox, gbox);
    const gc = glow.getContext('2d');
    if (gc) {
      const gs = gbox / 2;
      const gg = gc.createRadialGradient(gs, gs, 0, gs, gs, gs);
      gg.addColorStop(0, rgba(p.color, 0.5));
      gg.addColorStop(0.24, rgba(p.color, 0.24));
      gg.addColorStop(0.55, rgba(p.color, 0.08));
      gg.addColorStop(1, rgba(p.color, 0));
      gc.fillStyle = gg;
      gc.fillRect(0, 0, gbox, gbox);
    }
    p.glow = glow;
    void scale;
  }

  private buildGrain(): void {
    const n = 96;
    const cv = makeCanvas(n, n);
    const c = cv.getContext('2d');
    if (!c) return;
    const img = c.createImageData(n, n);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    c.putImageData(img, 0, 0);
    this.grain = cv;
  }

  /** 静态层：径向底 + 远景星尘 + 颗粒噪点（比舞台大一圈，给视差留余量） */
  private buildStatic(): void {
    const d = this.dpr;
    const pad = 28;
    const S = this.S;
    const size = S + pad * 2;
    if (this.staticLayer && this.staticSize === size && this.staticDpr === d) return;
    this.staticSize = size;
    this.staticDpr = d;

    const cv = makeCanvas(size * d, size * d);
    const c = cv.getContext('2d');
    if (!c) return;
    c.scale(d, d);

    // 深蓝黑径向底：中心稍亮，到边缘完全透明，融进页面星空
    const bg = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.56);
    bg.addColorStop(0, 'rgba(9,14,30,0.92)');
    bg.addColorStop(0.42, 'rgba(7,11,25,0.72)');
    bg.addColorStop(0.72, 'rgba(5,8,19,0.32)');
    bg.addColorStop(1, 'rgba(4,6,14,0)');
    c.fillStyle = bg;
    c.fillRect(0, 0, size, size);

    // 远景星尘：几十颗，位置固定，闪烁在动态层叠加
    const stars = this.opts.mobile ? 34 : 64;
    const seed = 20261027;
    let s = seed;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = 0; i < stars; i += 1) {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * size * 0.49;
      const x = size / 2 + Math.cos(a) * rr;
      const y = size / 2 + Math.sin(a) * rr;
      const rad = rnd() * 1.1 + 0.35;
      c.fillStyle = `rgba(226,236,255,${0.1 + rnd() * 0.45})`;
      c.beginPath();
      c.arc(x, y, rad, 0, Math.PI * 2);
      c.fill();
    }

    // 颗粒噪点
    if (this.grain) {
      const pat = c.createPattern(this.grain, 'repeat');
      if (pat) {
        c.globalAlpha = 0.5;
        c.fillStyle = pat;
        c.fillRect(0, 0, size, size);
        c.globalAlpha = 1;
      }
    }

    // 整图最外圈径向渐隐：底、星尘、噪点一起被裁成圆形软边，不留方形边界
    c.globalCompositeOperation = 'destination-in';
    const mask = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.54);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.56, 'rgba(0,0,0,0.9)');
    mask.addColorStop(0.82, 'rgba(0,0,0,0.34)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = mask;
    c.fillRect(0, 0, size, size);
    c.globalCompositeOperation = 'source-over';

    this.staticLayer = cv;
  }

  /* ---------- 生命周期 ---------- */

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    if (this.opts.reduced) {
      this.introT = 1;
      this.introDone = true;
      this.renderOnce();
      return;
    }
    const tick = (now: number) => {
      if (!this.running) return;
      // 没有交互时（指针不在星系上、也没停留过）降到 30fps：公转本来就慢，肉眼看不出；
      // 一旦指针进来（视差、悬停高亮）立刻回到显示器刷新率，保证交互跟手。
      // 动画仍按真实时间积分（dt 取自上次真正绘制的时刻），速度不变。
      const idle = this.hovered === null && now - this.pointerAt > INTERACT_HOLD_MS;
      if (idle && this.last && now - this.last < IDLE_FRAME_MS - 1) {
        this.raf = requestAnimationFrame(tick);
        return;
      }
      const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
      this.last = now;
      this.advance(dt);
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** 静止时（reduced-motion / 打断）重画一帧 */
  renderOnce(): void {
    this.computePositions();
    this.draw();
  }

  setPointer(nx: number, ny: number): void {
    this.pointerAt = performance.now();
    this.pxTarget = clamp(nx, -1, 1);
    this.pyTarget = clamp(ny, -1, 1);
  }

  setHovered(key: WorldKey | null): void {
    if (this.hovered === key) return;
    this.hovered = key;
    if (this.opts.reduced) this.renderOnce();
  }

  /** 命中测试：舞台坐标（css px）下最近的行星 */
  hit(x: number, y: number): WorldKey | null {
    let best: WorldKey | null = null;
    let bestD = Infinity;
    for (const p of this.planets) {
      const d = Math.hypot(p.x - x, p.y - y);
      const lim = Math.max(13, p.radius * 2.6);
      if (d < lim && d < bestD) {
        bestD = d;
        best = p.key;
      }
    }
    return best;
  }

  /* ---------- 每帧推进 ---------- */

  private advance(dt: number): void {
    this.time += dt;

    // 入场：0 → 2.5s
    if (!this.introDone) {
      this.introT = Math.min(1, this.introT + dt / 2.5);
      if (this.introT >= 1) this.introDone = true;
    }

    // 视差缓动
    this.px += (this.pxTarget - this.px) * Math.min(1, dt * 4);
    this.py += (this.pyTarget - this.py) * Math.min(1, dt * 4);

    // 公转：开普勒 T ∝ R^1.5；悬停的那颗暂停；推近时整幅冻结
    const paused = this.hovered;
    for (const p of this.planets) {
      if (p.key === paused) continue;
      p.theta += (Math.PI * 2 * dt) / p.period;
      if (p.theta > Math.PI * 2) p.theta -= Math.PI * 2;
    }

    // 呼吸
    for (const p of this.planets) p.flash = Math.max(0, p.flash - dt * 0.9);

    // 涟漪：每 6~8 秒从星核扩散一圈
    this.nextRipple -= dt;
    if (this.nextRipple <= 0) {
      this.ripples.push({ r: this.coreR * 0.4, t: 0 });
      this.nextRipple = 6 + Math.random() * 2;
    }
    for (const r of this.ripples) {
      r.t = Math.min(1, r.t + dt / 2.6);
      r.r += ((this.rOuter * 1.04) / 2.6) * dt;
      for (const p of this.planets) {
        if (Math.abs(p.R - r.r) < 9 && r.t < 0.94) p.flash = Math.max(p.flash, 0.85 * (1 - r.t));
      }
    }
    this.ripples = this.ripples.filter((r) => r.t < 1);

    // 彗星：沿极扁椭圆，近星核时跑得快
    const r = (this.cometA * (1 - this.cometE * this.cometE)) / (1 + this.cometE * Math.cos(this.cometNu));
    this.cometR = r;
    this.cometNu += (dt * 1.5) / Math.max(0.06, Math.pow(r / this.cometA, 2));
    if (this.cometNu > Math.PI * 2) this.cometNu -= Math.PI * 2;

  }

  /* ---------- 几何 ---------- */

  private point(theta: number, R: number): { x: number; y: number; depth: number } {
    const ct = Math.cos(TILT);
    const st = Math.sin(TILT);
    const a = Math.cos(theta) * R;
    const b = Math.sin(theta) * R * SQUASH;
    return { x: this.cx + a * ct - b * st, y: this.cy + a * st + b * ct, depth: Math.sin(theta) };
  }

  private computePositions(): void {
    for (const p of this.planets) {
      const pos = this.point(p.theta, p.R);
      p.x = pos.x;
      p.y = pos.y;
      p.depth = pos.depth;
      const litWave = this.introDone ? 1 : clamp((this.waveR() - p.R) / 44, 0, 1);
      const dim = this.hovered && this.hovered !== p.key ? 0.3 : 1;
      p.alpha = litWave * dim;
    }
  }

  private waveR(): number {
    if (this.opts.reduced) return this.rOuter * 2;
    return easeOut(this.introT) * (this.rOuter + 60);
  }

  /**
   * 标签位置：优先放在行星的径向外侧；贴边的行星外侧放不下时，
   * 依次试上/下/内侧，保证标签既不越界、也不压在自己的行星上。
   * 最后对挤在同一水平带的标签做一次让位，引线与 DOM 都用这一份坐标。
   */
  private computeLabels(): void {
    const pad = 6;
    const w = 104;
    const raw: { key: WorldKey; x: number; y: number; side: 1 | -1 }[] = [];
    for (const p of this.planets) {
      const dx = p.x - this.cx;
      const dy = p.y - this.cy;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const gap = p.radius + 16;
      const ox = this.px * 7;
      const oy = this.py * 7;
      // 径向外侧 → 上 → 下 → 内侧
      const dirs: [number, number][] = [[ux, uy], [-uy, ux], [uy, -ux], [-ux, -uy]];
      let best: { x: number; y: number; side: 1 | -1 } | null = null;
      let fallback: { x: number; y: number; side: 1 | -1 } | null = null;
      for (const [vx, vy] of dirs) {
        const ax = p.x + vx * gap + ox;
        const ay = p.y + vy * gap + oy;
        const side: 1 | -1 = vx >= 0 ? 1 : -1;
        const fitsX = side === 1 ? ax >= pad && ax + w <= this.S - pad : ax - w >= pad && ax <= this.S - pad;
        const fitsY = ay >= 14 && ay <= this.S - 14;
        const cand = { x: ax, y: clamp(ay, 14, this.S - 14), side };
        if (!fallback) fallback = cand;
        if (fitsX && fitsY) {
          best = cand;
          break;
        }
      }
      const pick = best ?? fallback!;
      raw.push({ key: p.key, x: pick.x, y: pick.y, side: pick.side });
    }
    raw.sort((a, b) => a.y - b.y);
    const placed: typeof raw = [];
    for (const it of raw) {
      let y = it.y;
      for (const q of placed) {
        if (Math.abs(q.x - it.x) < 96 && Math.abs(q.y - y) < 17) y = q.y + 18;
      }
      it.y = clamp(y, 14, this.S - 14);
      placed.push(it);
    }
    this.labelPos.clear();
    for (const it of raw) this.labelPos.set(it.key, { x: it.x, y: it.y, side: it.side });
  }

  /* ---------- 绘制 ---------- */

  private draw(): void {
    const { ctx, S, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    this.computePositions();
    this.computeLabels();


    // 背景（静态层，深一层视差）
    if (this.staticLayer) {
      const pad = 28;
      ctx.drawImage(this.staticLayer, -pad + this.px * 14, -pad + this.py * 14, this.staticSize, this.staticSize);
    }

    // 远景星尘闪烁（叠加在静态层上）
    this.drawDust();

    // 轨道层
    ctx.save();
    ctx.translate(this.px * 7, this.py * 7);
    this.drawOrbits();
    this.drawBelt();
    this.drawOrbitDust();
    ctx.restore();

    // 后半圈行星 → 星核 → 前半圈行星
    const others = this.planets;
    const back = others.filter((p) => p.depth <= 0).sort((a, b) => a.depth - b.depth);
    const front = others.filter((p) => p.depth > 0).sort((a, b) => a.depth - b.depth);

    for (const p of back) this.drawPlanet(p);
    this.drawCore();
    this.drawRipples();
    for (const p of front) this.drawPlanet(p);

    // 彗星
    this.drawComet();

    // 引线（在标签之下）
    this.drawLeaders();

    this.emitLabels();
  }

  private emitLabels(): void {
    const cb = this.opts.onLabels;
    if (!cb) return;
    const frames: LabelFrame[] = this.planets.map((p) => {
      const pos = this.labelPos.get(p.key) ?? { x: p.x, y: p.y, side: 1 as const };
      return {
        key: p.key,
        x: pos.x,
        y: pos.y,
        side: pos.side,
        alpha:
          (this.introDone ? 1 : clamp((this.waveR() - p.R) / 44, 0, 1)) *
          (p.alpha < 0.999 ? 0.55 : 1),
        active: this.hovered === p.key,
        dimmed: !!this.hovered && this.hovered !== p.key,
      };
    });
    cb(frames);
  }

  /** 远景星尘的微闪（几十颗，逐帧很便宜） */
  private drawDust(): void {
    const { ctx } = this;
    const n = this.opts.mobile ? 34 : 64;
    ctx.save();
    ctx.translate(this.px * 14, this.py * 14);
    for (let i = 0; i < n; i += 1) {
      const a = i * 2.399963;
      const rr = Math.sqrt((i + 0.5) / n) * this.S * 0.5;
      const x = this.S / 2 + Math.cos(a) * rr;
      const y = this.S / 2 + Math.sin(a) * rr;
      const tw = 0.5 + 0.5 * Math.sin(this.time * (0.5 + (i % 5) * 0.17) + i);
      ctx.fillStyle = `rgba(214,228,255,${0.06 + tw * 0.22})`;
      ctx.fillRect(x, y, 1.1, 1.1);
    }
    ctx.restore();
  }

  private ellipsePath(R: number, from: number, to: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, R, R * SQUASH, TILT, from, to);
  }

  private drawOrbits(): void {
    const { ctx } = this;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (const p of this.planets) {
      const lit = this.introDone ? 1 : clamp((this.waveR() - p.R) / 60, 0, 1);
      if (lit <= 0) continue;
      const dim = this.hovered && this.hovered !== p.key ? 0.34 : 1;
      const isHot = this.hovered === p.key;
      const base = 0.06 * lit * dim;

      // 底线：前半圈 6%，后半圈 ×0.5
      ctx.strokeStyle = rgba(p.line, base);
      ctx.lineWidth = 0.85;
      this.ellipsePath(p.R, 0, Math.PI);
      ctx.stroke();

      ctx.strokeStyle = rgba(p.line, base * 0.5);
      this.ellipsePath(p.R, Math.PI, Math.PI * 2);
      ctx.stroke();

      // 尾迹：行星身后约 150°（选中时 220°）的渐隐弧
      const span = isHot ? (220 * Math.PI) / 180 : (150 * Math.PI) / 180;
      const head = this.point(p.theta, p.R);
      const tail = this.point(p.theta - span, p.R);
      const g = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      g.addColorStop(0, rgba(shade(p.color, 0.35), 0.92 * lit));
      g.addColorStop(0.22, rgba(p.line, 0.5 * lit));
      g.addColorStop(0.62, rgba(p.line, 0.16 * lit));
      g.addColorStop(1, rgba(p.line, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = isHot ? 1.7 : 1.15;
      this.ellipsePath(p.R, p.theta - span, p.theta);
      ctx.stroke();

      // 行星处的一小段更亮的头
      ctx.strokeStyle = rgba(shade(p.color, 0.6), 0.75 * lit * (isHot ? 1 : 0.85));
      ctx.lineWidth = isHot ? 2.4 : 1.7;
      this.ellipsePath(p.R, p.theta - 0.16, p.theta);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  /** 两条轨道之间的小行星带（很淡，随时间缓慢漂移） */
  private drawBelt(): void {
    const { ctx } = this;
    const n = this.opts.mobile ? 54 : 104;
    const R = this.rOuter * ((2.55 + 2.75) / 2 / 3.2);
    const spread = this.rOuter * 0.034;
    ctx.fillStyle = 'rgba(196,206,232,0.22)';
    for (let i = 0; i < n; i += 1) {
      const th = (i / n) * Math.PI * 2 + this.time * 0.004 + (i % 7) * 0.11;
      const rr = R + ((i % 13) / 13 - 0.5) * spread * 2;
      const pos = this.point(th, rr);
      ctx.globalAlpha = 0.12 + ((i * 37) % 11) / 40;
      ctx.fillRect(pos.x, pos.y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** 轨道尘粒：每条 60~150 颗，带轻微上下抖动、沿轨道缓慢漂移 */
  private drawOrbitDust(): void {
    const { ctx } = this;
    const n = this.opts.mobile ? 42 : 120;
    for (const p of this.planets) {
      const lit = this.introDone ? 1 : clamp((this.waveR() - p.R) / 60, 0, 1);
      if (lit <= 0) continue;
      const dim = this.hovered && this.hovered !== p.key ? 0.3 : 1;
      ctx.fillStyle = rgba(p.line, 0.9);
      for (let i = 0; i < n; i += 1) {
        const seed = (i * 2654435761) % 1000 / 1000;
        const th = seed * Math.PI * 2 + this.time * 0.012 * (0.6 + (i % 5) * 0.12);
        const jitter = Math.sin(this.time * 1.6 + i * 1.7) * 1.3;
        const pos = this.point(th, p.R + jitter);
        ctx.globalAlpha = (0.1 + ((i * 29) % 13) / 60) * lit * dim;
        ctx.fillRect(pos.x, pos.y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPlanet(p: Planet): void {
    const { ctx } = this;
    const a = p.alpha;
    if (a <= 0.01) return;

    // 深度：前方放大 12% 变亮，后方缩小 12% 变暗
    const depthK = 1 + p.depth * 0.12;
    const bright = 0.78 + 0.22 * (p.depth * 0.5 + 0.5) + p.flash * 0.7;
    const r = p.radius * depthK;
    const offX = this.px * 7;
    const offY = this.py * 7;
    const x = p.x + offX;
    const y = p.y + offY;

    ctx.save();
    // 呼吸光晕
    const breathe = 0.55 + 0.45 * Math.sin(this.time * 1.05 + p.phase);
    const gd = this.planets.length ? p.glow.width : 0;
    if (gd) {
      const gscale = (r * 2.6) / (gd / this.dpr);
      ctx.globalAlpha = a * (0.22 + breathe * 0.2) * Math.min(1.9, bright);
      ctx.drawImage(p.glow, x - (gd * gscale) / 2 / this.dpr, y - (gd * gscale) / 2 / this.dpr, (gd * gscale) / this.dpr, (gd * gscale) / this.dpr);
    }

    // 行星环（书影音）：倾角与自己的轨道一致
    if (p.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(TILT);
      ctx.strokeStyle = rgba(shade(p.color, 0.3), 0.55 * a);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.05, r * 2.05 * SQUASH, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(shade(p.color, 0.55), 0.3 * a);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.72, r * 1.72 * SQUASH, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 本体：旋转让亮面朝向星核
    const dirX = this.cx - x;
    const dirY = this.cy - y;
    const ang = Math.atan2(dirY, dirX) - Math.PI;
    ctx.globalAlpha = a * Math.min(1, bright);
    ctx.translate(x, y);
    ctx.rotate(ang);
    const s = p.spriteSize / this.dpr;
    const draw = s * (r / Math.max(0.5, p.radius));
    ctx.drawImage(p.sprite, -draw / 2, -draw / 2, draw, draw);
    ctx.rotate(-ang);

    // 小卫星
    if (p.moon) {
      const ma = this.time * 0.9 + p.phase;
      const mr = r * 2.4;
      const mx = Math.cos(ma) * mr;
      const my = Math.sin(ma) * mr * SQUASH;
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = rgba(shade(p.color, 0.55), 0.9);
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(1, r * 0.19), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCore(): void {
    const grow = this.opts.reduced ? 1 : clamp(this.introT / 0.22, 0, 1);
    if (grow <= 0) return;
    const x = this.cx + this.px * 4;
    const y = this.cy + this.py * 4;
    // 星核：core-glow.html 那套星盘（预渲染两张图，每帧只做两次贴图）。
    // half 是整张 800×800 图案的半径，星盘占其中的 85%；见 resize() 里 coreHalf 的取法。
    if (!this.core) this.core = new CoreGlow({ count: this.opts.mobile ? 9000 : 16000 });
    this.core.draw(this.ctx, x, y, this.coreHalf, this.dpr, this.time, SQUASH, TILT, grow);
  }

  private drawRipples(): void {
    const { ctx } = this;
    for (const r of this.ripples) {
      ctx.save();
      ctx.translate(this.cx + this.px * 4, this.cy + this.py * 4);
      ctx.strokeStyle = `rgba(248,224,162,${0.3 * (1 - r.t) * (1 - r.t)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, r.r, r.r * SQUASH, TILT, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawComet(): void {
    const { ctx } = this;
    const pos = this.point(this.cometNu, this.cometR);
    const x = pos.x + this.px * 7;
    const y = pos.y + this.py * 7;
    const behind = pos.depth <= 0;
    const near = clamp(1 - (this.cometR - this.coreR) / (this.rOuter * 0.9), 0.08, 1);
    const tailLen = 16 + near * near * 96;

    // 尾巴背向星核
    const dx = x - this.cx;
    const dy = y - this.cy;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;

    ctx.save();
    ctx.globalAlpha = behind ? 0.4 : 1;
    const layers = this.opts.mobile ? 2 : 3;
    for (let i = 0; i < layers; i += 1) {
      const k = (i + 1) / layers;
      const g = ctx.createLinearGradient(x, y, x + ux * tailLen, y + uy * tailLen);
      g.addColorStop(0, `rgba(200,240,255,${0.42 * k})`);
      g.addColorStop(0.5, `rgba(160,214,236,${0.16 * k})`);
      g.addColorStop(1, 'rgba(140,200,230,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.6 * k;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + ux * tailLen, y + uy * tailLen);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(240,252,255,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawLeaders(): void {
    const { ctx } = this;
    for (const p of this.planets) {
      const a = p.alpha;
      if (a <= 0.01) continue;
      const pos = this.labelPos.get(p.key);
      if (!pos) continue;
      const dx = p.x - this.cx;
      const dy = p.y - this.cy;
      const d = Math.hypot(dx, dy) || 1;
      const sx = p.x + (dx / d) * (p.radius + 2) + this.px * 7;
      const sy = p.y + (dy / d) * (p.radius + 2) + this.py * 7;

      const hot = this.hovered === p.key;
      ctx.strokeStyle = rgba(p.line, (hot ? 0.5 : 0.22) * a);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  }
}

