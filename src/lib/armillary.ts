/**
 * 浑天仪引擎 —— 移植自 C:\Users\xinguangchenyuan\Downloads\armillary_v2_fixed.html
 *
 * 几何、配色（BONE / GOLD / PALE）、随机种子（rng(101) 及其调用顺序）、绘制顺序
 * 与原文件逐行对应，未做「重新设计」。仅有的适配：
 *  1. 不画原文件里的背景星空 canvas、颗粒层、暗角、HUD、图层按钮 —— 演示页的 Chrome，
 *     欢迎页本身已有星空（SkyCanvas）和颗粒层，叠两份会脏。
 *  2. 交互只保留鼠标视差（原文件的拖拽 / 方向键属于演示页交互），自转与呼吸照旧。
 *  3. 渲染按 fps 限帧（默认 30）；所有运动的角速度都是按毫秒积分的，限帧不改变速度。
 *  4. 画布分辨率上限从 1.8 收到 1.35（原文件是独立演示页，欢迎页要和星空层共用预算）。
 */

const TAU = Math.PI * 2;
const BONE = '233,232,226';
const GOLD = '229,191,50';
const PALE = '246,224,158';

const rgba = (c: string, a: number) => `rgba(${c},${a})`;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** 画布逻辑尺寸 1000，比 800 的 SVG 多出一圈留给外环 */
const L = 1000;
const CX = 500;
const CY = 500;

/* ---------- 工具（与源文件一致） ---------- */
function rng(s: number) {
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r0 = rng(101);
const rr = (a: number, b: number) => a + r0() * (b - a);
const gauss = () => (r0() + r0() + r0() + r0() - 2) * 1.73;

type Pt = [number, number];
type V3 = [number, number, number];

const GRID: Pt[] = [
  [-0.5, -1], [0, -1], [0.5, -1],
  [-0.5, 0], [0, 0], [0.5, 0],
  [-0.5, 1], [0, 1], [0.5, 1],
];

function runeSegs(): Array<[Pt, Pt]> {
  const n = 2 + ((r0() * 3) | 0);
  const segs: Array<[Pt, Pt]> = [];
  let c = (r0() * 9) | 0;
  for (let i = 0; i < n; i += 1) {
    let nx = (r0() * 9) | 0;
    if (nx === c) nx = (nx + 4) % 9;
    segs.push([GRID[c], GRID[nx]]);
    c = nx;
  }
  return segs;
}

function runePath(ctx: CanvasRenderingContext2D, segs: Array<[Pt, Pt]>, x: number, y: number, s: number, ang: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  for (const [a, b] of segs) {
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.restore();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, c: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${c},${a})`);
  g.addColorStop(0.4, `rgba(${c},${a * 0.32})`);
  g.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

const rotX = (v: V3, a: number): V3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
};
const rotY = (v: V3, a: number): V3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
};
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/* ---------- 世界数据（固定种子，每次打开一致；构造顺序与源文件相同） ---------- */
const R0 = 300;
const TILT = 0.41;
const F = 1500;

const RUNES = Array.from({ length: 72 }, runeSegs);

/** 尘盘：在原有基础上加入两条旋臂 */
const DUST = Array.from({ length: 2400 }, (_, i) => {
  let a = r0() * TAU;
  const rad = rr(125, 345) + gauss() * 10;
  if (i % 3) {
    const arm = (i % 2) * Math.PI;
    a = rad * 0.014 + arm + gauss() * 0.28;
  }
  return [Math.cos(a) * rad, gauss() * (5 + rad * 0.022), Math.sin(a) * rad, rr(0.4, 1.5), rr(0.25, 0.9)] as const;
});

/** 天球上的恒星与星座 */
const NS = 240;
const SPHERE_STARS = Array.from({ length: NS }, () => {
  const u = r0() * 2 - 1;
  const a = r0() * TAU;
  const q = Math.sqrt(1 - u * u);
  return [395 * q * Math.cos(a), 395 * u, 395 * q * Math.sin(a), Math.pow(r0(), 3) * 2.2 + 0.5, r0() * 6.28] as const;
});

const CHAINS = (() => {
  const used = new Set<number>();
  const out: number[][] = [];
  const d3 = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (let s = 0; s < 10; s += 1) {
    let i = 0;
    let g = 0;
    do {
      i = (r0() * NS) | 0;
      g += 1;
    } while (used.has(i) && g < 99);
    const ch = [i];
    used.add(i);
    for (let k = 0; k < 4; k += 1) {
      const last = SPHERE_STARS[ch[ch.length - 1]];
      let best = -1;
      let bd = 1e9;
      for (let j = 0; j < NS; j += 1) {
        if (used.has(j)) continue;
        const d = d3(last, SPHERE_STARS[j]);
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      if (best < 0 || bd > 190) break;
      ch.push(best);
      used.add(best);
    }
    if (ch.length > 2) out.push(ch);
  }
  return out;
})();

/** 行星（轨道半径 / 倾角 / 升交点 / 角速度 / 半径 / 初相） */
const PLANETS = [
  { R: 150, inc: 0.9, node: 0.4, sp: 0.00052, r: 7, ph: 0.5, col: BONE, moon: false },
  { R: 215, inc: -0.4, node: 2.2, sp: 0.00034, r: 11, ph: 2.6, col: PALE, moon: true },
  { R: 270, inc: 0.25, node: 4.1, sp: 0.00022, r: 8, ph: 4.2, col: BONE, moon: false },
];

const orbF = (Rr: number, inc: number, node: number) => (th: number): V3 =>
  rotY(rotX([Rr * Math.cos(th), 0, Rr * Math.sin(th)], inc), node);

/** 彗星：偏心率 0.8 的椭圆，近日点掠过核心 */
const COM = { a: 215, e: 0.8, inc: 1.1, node: 0.5, th: 2.5, n: TAU / 72000 };
const comPos = (th: number) => {
  const r = (COM.a * (1 - COM.e * COM.e)) / (1 + COM.e * Math.cos(th));
  return { r, v: rotY(rotX([r * Math.cos(th), 0, r * Math.sin(th)], COM.inc), COM.node) };
};

/** 十二地支 */
const BRANCH = '子丑寅卯辰巳午未申酉戌亥';

/* ---------- 曲线 ---------- */
const eq = (Rr: number) => (th: number): V3 => [Rr * Math.cos(th), 0, Rr * Math.sin(th)];
const mer = (Rr: number, az: number) => (th: number): V3 => [
  Rr * Math.cos(th) * Math.cos(az),
  Rr * Math.sin(th),
  Rr * Math.cos(th) * Math.sin(az),
];
const lat = (Rr: number, l: number) => (th: number): V3 => [
  Rr * Math.cos(l) * Math.cos(th),
  Rr * Math.sin(l),
  Rr * Math.cos(l) * Math.sin(th),
];
const ecl = (Rr: number, tl: number) => (th: number): V3 => [
  Rr * Math.cos(th) * Math.cos(tl),
  Rr * Math.cos(th) * Math.sin(tl),
  Rr * Math.sin(th),
];
const gyro = (Rr: number, t: number, s1: number, s2: number, p: number) => (th: number): V3 =>
  rotX(rotY([Rr * Math.cos(th), 0, Rr * Math.sin(th)], t * s1 + p), t * s2 + p * 2);

/* ---------- 渲染 ---------- */

interface Proj {
  x: number;
  y: number;
  z: number;
  s: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface ArmillaryOptions {
  canvas: HTMLCanvasElement;
  /** 视差位移施加在这个元素上（相当于源文件的 .art） */
  stage?: HTMLElement;
  /** 渲染上限帧率，0 = 不限帧 */
  fps?: number;
  /** 在这个元素上按住拖动可以旋转浑天仪（鼠标 / 触摸 / 笔）；不传则不可拖动 */
  dragTarget?: HTMLElement;
  /** 画布分辨率上限（相对逻辑尺寸 1000 的倍数） */
  maxScale?: number;
}

export class Armillary {
  private canvas: HTMLCanvasElement;
  private stage?: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  private fps: number;
  private maxScale: number;
  private reduced: boolean;

  private K = 1.8;
  private raf = 0;
  private lastT = 0;
  private startT = 0;
  private running = false;
  private visible = true;
  private hudTick = 0;

  private yaw = 0.6;
  private pitch = 0.5;
  /** 拖动：松手后的惯性角速度（弧度 / 16.7ms，按帧间隔换算，限帧也不改变手感） */
  private vYaw = 0;
  private vPit = 0;
  private dragging = false;
  private dragId = -1;
  private lastX = 0;
  private lastY = 0;
  /** 俯仰的缓慢摆动幅度 0..1：拖动时淡出、松手后淡入，避免摆动开关造成的跳变 */
  private wobble = 1;
  private dragTarget?: HTMLElement;
  private tx = 0;
  private ty = 0;
  private mx = 0;
  private my = 0;

  private layers = { stars: true, bodies: true, glyphs: true, auto: true };

  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    this.tx = e.clientX / window.innerWidth - 0.5;
    this.ty = e.clientY / window.innerHeight - 0.5;
  };
  private onVisibility = () => {
    this.lastT = 0;
    this.schedule();
  };

  /* ---------- 拖动旋转（与 armillary_v2_fixed.html 的手感一致：横向转方位、纵向改俯仰，松手后带惯性） ---------- */
  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.dragging) return;
    this.dragging = true;
    this.dragId = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.vYaw = 0;
    this.vPit = 0;
    this.dragTarget?.classList.add('is-dragging');
    try {
      this.dragTarget?.setPointerCapture(e.pointerId);
    } catch {
      /* 指针已失效等情况：忽略，下面的 move/up 仍然会按 pointerId 处理 */
    }
    this.lastT = 0;
    this.schedule();
  };
  private onDragMove = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.dragId) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.yaw += dx * 0.008;
    this.vYaw = dx * 0.008;
    this.pitch = clamp(this.pitch + dy * 0.006, 0.05, 1.35);
    this.vPit = dy * 0.006;
    if (this.reduced) this.render(this.startT);
  };
  private onUp = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.dragId) return;
    this.dragging = false;
    this.dragId = -1;
    this.dragTarget?.classList.remove('is-dragging');
    try {
      this.dragTarget?.releasePointerCapture(e.pointerId);
    } catch {
      /* 已经被浏览器释放：忽略 */
    }
    this.lastT = 0;
    this.schedule();
  };

  constructor(opts: ArmillaryOptions) {
    this.canvas = opts.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.stage = opts.stage;
    this.dragTarget = opts.dragTarget;
    this.fps = opts.fps ?? 30;
    this.maxScale = opts.maxScale ?? 1.35;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** 画布像素数按屏幕实际显示大小取：普通屏不必画满，高分屏封顶 */
  resize() {
    // 用 offsetWidth（布局尺寸）而不是 getBoundingClientRect：后者含入场动画的 scale，会量出偏大的值
    const css = this.canvas.offsetWidth || 1100;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    this.K = clamp((css * d) / L, 0.9, this.maxScale);
    const px = Math.round(L * this.K);
    if (this.canvas.width !== px) {
      this.canvas.width = px;
      this.canvas.height = px;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    const dt = this.dragTarget;
    if (dt) {
      dt.addEventListener('pointerdown', this.onDown);
      dt.addEventListener('pointermove', this.onDragMove);
      dt.addEventListener('pointerup', this.onUp);
      dt.addEventListener('pointercancel', this.onUp);
    }
    this.ro = new ResizeObserver(() => {
      this.resize();
      if (this.reduced) this.render(this.startT);
    });
    this.ro.observe(this.canvas);
    if ('IntersectionObserver' in window && this.stage) {
      this.io = new IntersectionObserver(
        (entries) => {
          this.visible = entries[entries.length - 1].isIntersecting;
          this.lastT = 0;
          this.schedule();
        },
        { rootMargin: '80px' },
      );
      this.io.observe(this.stage);
    }
    if (this.reduced) {
      this.render(this.startT);
      return;
    }
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastT = 0;
  }

  dispose() {
    this.stop();
    this.ro?.disconnect();
    this.io?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('visibilitychange', this.onVisibility);
    const dt = this.dragTarget;
    if (dt) {
      dt.removeEventListener('pointerdown', this.onDown);
      dt.removeEventListener('pointermove', this.onDragMove);
      dt.removeEventListener('pointerup', this.onUp);
      dt.removeEventListener('pointercancel', this.onUp);
      dt.classList.remove('is-dragging');
    }
    this.dragging = false;
  }

  private shouldRun() {
    return this.running && !this.reduced && this.visible && !document.hidden;
  }

  private schedule() {
    if (!this.raf && this.shouldRun()) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (t: number) => {
    this.raf = 0;
    if (!this.shouldRun()) {
      this.lastT = 0;
      return;
    }
    // 限帧：还没到间隔就先跳过这一拍（不更新 lastT，dt 照样按真实时间积分）
    // 拖动中和惯性滑行时不限帧（跟手）；其余时候按 fps 限帧
    const interacting = this.dragging || Math.abs(this.vYaw) > 1e-4 || Math.abs(this.vPit) > 1e-4;
    if (this.fps > 0 && !interacting && this.lastT && t - this.lastT < 1000 / this.fps - 1.5) {
      this.schedule();
      return;
    }
    const dt = Math.min(64, t - (this.lastT || t));
    this.lastT = t;
    if (!this.startT) this.startT = t;
    const f = dt / 16.667; // 把「按 60fps 一帧」的惯性参数换算成真实时间
    if (!this.dragging) {
      this.yaw += this.vYaw * f + (this.layers.auto ? 0.00006 * dt : 0);
      this.pitch = clamp(this.pitch + this.vPit * f, 0.05, 1.35);
      this.vYaw *= Math.pow(0.94, f);
      this.vPit *= Math.pow(0.9, f);
    }
    this.wobble += ((this.dragging ? 0 : 1) - this.wobble) * Math.min(1, dt * 0.004);
    const c = comPos(COM.th);
    COM.th += (COM.n * dt * COM.a * COM.a * Math.sqrt(1 - COM.e * COM.e)) / (c.r * c.r);
    this.mx += (this.tx - this.mx) * 0.04;
    this.my += (this.ty - this.my) * 0.04;
    if (this.stage) {
      this.stage.style.transform = `translate3d(${(this.mx * 14).toFixed(2)}px,${(this.my * 14).toFixed(2)}px,0)`;
    }
    this.render(t);
    this.hudTick += 1;
    this.schedule();
  };

  private render(t: number) {
    const ctx = this.ctx;
    const K = this.K;
    const cyw = Math.cos(this.yaw);
    const syw = Math.sin(this.yaw);
    const pit = this.pitch + this.wobble * 0.07 * Math.sin(t * 0.00017);
    const cp = Math.cos(pit);
    const sp = Math.sin(pit);

    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.clearRect(0, 0, L, L);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.setLineDash([]);

    const P = (x: number, y: number, z: number): Proj => {
      const x1 = x * cyw + z * syw;
      const z1 = -x * syw + z * cyw;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const s = F / (F - z2);
      return { x: CX + x1 * s, y: CY - y2 * s, z: z2, s, vx: x1, vy: y2, vz: z2 };
    };
    const PV = (v: V3) => P(v[0], v[1], v[2]);
    const pr = (f: (th: number) => V3) => (th: number) => PV(f(th));

    const ring = (
      fn: (th: number) => Proj,
      n: number,
      col: string,
      w: number,
      aF: number,
      aB: number,
    ) => {
      const pf = new Path2D();
      const pb = new Path2D();
      let p = fn(0);
      for (let i = 1; i <= n; i += 1) {
        const q = fn((i / n) * TAU);
        const pa = p.z + q.z > 0 ? pf : pb;
        pa.moveTo(p.x, p.y);
        pa.lineTo(q.x, q.y);
        p = q;
      }
      ctx.lineWidth = w;
      ctx.strokeStyle = rgba(col, aB);
      ctx.stroke(pb);
      ctx.strokeStyle = rgba(col, aF);
      ctx.stroke(pf);
    };

    const tickRing = (
      f: (th: number) => V3,
      Rr: number,
      n: number,
      len: number,
      every: number,
      col: string,
      w: number,
      aF: number,
      aB: number,
    ) => {
      const pf = new Path2D();
      const pb = new Path2D();
      for (let i = 0; i < n; i += 1) {
        const Lp = f((i / n) * TAU);
        const l = i % every === 0 ? len * 2 : len;
        const k = 1 - l / Rr;
        const a = P(Lp[0], Lp[1], Lp[2]);
        const b = P(Lp[0] * k, Lp[1] * k, Lp[2] * k);
        const pa = a.z > 0 ? pf : pb;
        pa.moveTo(a.x, a.y);
        pa.lineTo(b.x, b.y);
      }
      ctx.lineWidth = w;
      ctx.strokeStyle = rgba(col, aB);
      ctx.stroke(pb);
      ctx.strokeStyle = rgba(col, aF);
      ctx.stroke(pf);
    };

    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, CX, CY, 190, GOLD, 0.28);
    ctx.globalCompositeOperation = 'source-over';

    /* ① 天球恒星与星座（最远的一层） */
    if (this.layers.stars) {
      const spj = SPHERE_STARS.map((s) => P(s[0], s[1], s[2]));
      ctx.lineWidth = 0.6;
      for (const ch of CHAINS) {
        for (let i = 0; i < ch.length - 1; i += 1) {
          const a = spj[ch[i]];
          const b = spj[ch[i + 1]];
          const d = clamp(((a.z + b.z) / 2 + 395) / 790);
          ctx.strokeStyle = rgba(GOLD, 0.05 + 0.3 * d * d);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = rgba(BONE, 1);
      for (let i = 0; i < NS; i += 1) {
        const s = SPHERE_STARS[i];
        const p = spj[i];
        const d = clamp((p.z + 395) / 790);
        const tw = this.reduced ? 1 : 0.6 + 0.4 * Math.sin(t * 0.0012 + s[4]);
        ctx.globalAlpha = (0.15 + 0.85 * d) * tw * Math.min(1, 0.35 + s[3] * 0.4);
        const z = s[3] * 0.55 * p.s;
        ctx.fillRect(p.x - z / 2, p.y - z / 2, z, z);
        ctx.globalAlpha = 1;
        if (s[3] > 1.7) {
          ctx.strokeStyle = rgba(BONE, 0.5 * d * tw);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 5 * p.s, p.y);
          ctx.lineTo(p.x + 5 * p.s, p.y);
          ctx.moveTo(p.x, p.y - 5 * p.s);
          ctx.lineTo(p.x, p.y + 5 * p.s);
          ctx.stroke();
        }
      }
    }

    /* ② 尘盘 */
    ctx.fillStyle = rgba(BONE, 1);
    for (const d of DUST) {
      const p = P(d[0], d[1], d[2]);
      ctx.globalAlpha = d[4] * (0.25 + 0.75 * clamp((p.z + 345) / 690));
      ctx.fillRect(p.x, p.y, d[3] * p.s, d[3] * p.s);
    }
    ctx.globalAlpha = 1;

    /* ③ 子午圈、纬圈、赤道与黄道 */
    for (let k = 0; k < 6; k += 1) ring(pr(mer(R0, (k * Math.PI) / 6)), 180, BONE, 0.7, 0.5, 0.12);
    for (const l of [-0.87, -0.41, 0.41, 0.87]) ring(pr(lat(R0, l)), 140, BONE, 0.6, 0.4, 0.1);
    ring(pr(eq(R0)), 220, BONE, 1.2, 0.95, 0.28);
    tickRing(eq(R0), R0, 360, 5, 10, BONE, 0.7, 0.85, 0.2);
    ring(pr(eq(346)), 220, BONE, 0.6, 0.55, 0.15);
    tickRing(eq(346), 346, 144, 6, 12, BONE, 0.6, 0.6, 0.14);
    ring(pr(eq(374)), 240, BONE, 0.9, 0.7, 0.18);
    tickRing(eq(374), 374, 72, 7, 6, GOLD, 0.8, 0.7, 0.16);
    ring(pr(ecl(330, TILT)), 240, GOLD, 1.7, 0.95, 0.3);
    tickRing(ecl(330, TILT), 330, 120, 7, 10, GOLD, 0.8, 0.8, 0.2);
    ring(pr(ecl(255, -0.78)), 200, BONE, 0.9, 0.55, 0.14);
    tickRing(ecl(255, -0.78), 255, 96, 5, 8, BONE, 0.6, 0.5, 0.12);
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 72; i += 1) {
      const th = (i / 72) * TAU;
      const a = P(374 * Math.cos(th), 0, 374 * Math.sin(th));
      const b = P(374 * Math.cos(th + 0.02), 0, 374 * Math.sin(th + 0.02));
      ctx.beginPath();
      runePath(ctx, RUNES[i], a.x + (a.x - CX) * 0.045, a.y + (a.y - CY) * 0.045, 6.5 * a.s, Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2);
      ctx.strokeStyle = rgba(BONE, 0.12 + 0.5 * clamp((a.z + 374) / 748));
      ctx.stroke();
    }

    /* ④ 行星轨道、彗星轨道（极淡） */
    if (this.layers.bodies) {
      for (const p of PLANETS) ring(pr(orbF(p.R, p.inc, p.node)), 140, BONE, 0.5, 0.2, 0.06);
      ctx.setLineDash([2, 6]);
      const cp0 = new Path2D();
      const cb0 = new Path2D();
      let prev: Proj | null = null;
      for (let i = 0; i <= 200; i += 1) {
        const th = (i / 200) * TAU;
        const q = PV(comPos(th).v);
        if (prev) {
          const target = prev.z + q.z > 0 ? cp0 : cb0;
          target.moveTo(prev.x, prev.y);
          target.lineTo(q.x, q.y);
        }
        prev = q;
      }
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = rgba(GOLD, 0.1);
      ctx.stroke(cb0);
      ctx.strokeStyle = rgba(GOLD, 0.34);
      ctx.stroke(cp0);
      ctx.setLineDash([]);
    }

    /* ⑤ 极轴 */
    const n0 = P(0, -440, 0);
    const n1 = P(0, 440, 0);
    const gr = ctx.createLinearGradient(n0.x, n0.y, n1.x, n1.y);
    gr.addColorStop(0, rgba(GOLD, 0));
    gr.addColorStop(0.5, rgba(GOLD, 0.55));
    gr.addColorStop(1, rgba(GOLD, 0));
    ctx.strokeStyle = gr;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(n0.x, n0.y);
    ctx.lineTo(n1.x, n1.y);
    ctx.stroke();
    // 南北极星
    for (const sy of [-1, 1]) {
      const q = P(0, sy * 440, 0);
      const d = 0.55 + 0.45 * clamp((q.z + 440) / 880);
      ctx.fillStyle = rgba(sy > 0 ? GOLD : BONE, 0.9 * d);
      ctx.beginPath();
      ctx.moveTo(q.x, q.y - 9 * q.s);
      ctx.quadraticCurveTo(q.x + 1.4, q.y - 1.4, q.x + 9 * q.s, q.y);
      ctx.quadraticCurveTo(q.x + 1.4, q.y + 1.4, q.x, q.y + 9 * q.s);
      ctx.quadraticCurveTo(q.x - 1.4, q.y + 1.4, q.x - 9 * q.s, q.y);
      ctx.quadraticCurveTo(q.x - 1.4, q.y - 1.4, q.x, q.y - 9 * q.s);
      ctx.fill();
    }

    /* ⑥ 十二地支外环（始终正对观察者，远处的淡） */
    if (this.layers.glyphs) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 12; i += 1) {
        const th = (i / 12) * TAU;
        const p = P(432 * Math.cos(th), 0, 432 * Math.sin(th));
        const d = clamp((p.z + 432) / 864);
        ctx.font = `${(i === 0 ? 19 : 15) * p.s}px "Noto Serif SC","Songti SC","STSong","SimSun",serif`;
        ctx.fillStyle = i === 0 ? rgba(GOLD, 0.2 + 0.8 * d) : rgba(BONE, 0.1 + 0.7 * d);
        ctx.fillText(BRANCH[i], p.x, p.y);
        const m = P(432 * Math.cos(th + TAU / 24), 0, 432 * Math.sin(th + TAU / 24));
        ctx.fillStyle = rgba(GOLD, 0.1 + 0.5 * d);
        ctx.fillRect(m.x - 1, m.y - 1, 2, 2);
      }
    }

    /* ⑦ 光珠 */
    ctx.globalCompositeOperation = 'lighter';
    const beads: Array<[(th: number) => V3, number, string, number]> = [
      [ecl(330, TILT), t * 0.00032, GOLD, 34],
      [eq(R0), -t * 0.00021, BONE, 24],
      [mer(R0, Math.PI / 3), t * 0.00026 + 1, BONE, 22],
      [ecl(255, -0.78), t * 0.0004 + 2, GOLD, 22],
    ];
    for (const [f, th, c, g] of beads) {
      const q = pr(f)(th);
      glow(ctx, q.x, q.y, g * q.s, c, 0.9);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const [f, th] of beads) {
      const q = pr(f)(th);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(q.x, q.y, 3.2 * q.s, 0, TAU);
      ctx.fill();
    }

    /* ⑧ 行星（在核心后方的先画） */
    const bodies: Array<{ p: Proj; rad: number; col: string }> = [];
    if (this.layers.bodies) {
      for (const pl of PLANETS) {
        const th = pl.ph + t * pl.sp;
        const w = orbF(pl.R, pl.inc, pl.node)(th);
        const p = PV(w);
        bodies.push({ p, rad: pl.r, col: pl.col });
        if (pl.moon) {
          const m = rotY(rotX([32 * Math.cos(t * 0.0021), 0, 32 * Math.sin(t * 0.0021)], pl.inc + 0.6), pl.node + 1);
          const mp = P(w[0] + m[0], w[1] + m[1], w[2] + m[2]);
          bodies.push({ p: mp, rad: 3.4, col: BONE });
        }
      }
      bodies.sort((a, b) => a.p.z - b.p.z);
      for (const b of bodies) if (b.p.z < 0) this.sphereBody(b.p, b.rad, b.col);
    }

    /* ⑨ 陀螺仪小环 + 核心 */
    ring(pr(gyro(78, t, 0.00033, 0.00021, 0)), 90, BONE, 0.7, 0.55, 0.2);
    ring(pr(gyro(100, t, -0.00027, 0.00029, 1.7)), 110, BONE, 0.6, 0.45, 0.16);
    ring(pr(gyro(122, t, 0.00019, -0.00023, 3.1)), 130, GOLD, 0.7, 0.5, 0.16);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i += 1) {
      const a = (i / 40) * TAU + t * 0.00004;
      const l = 16 + 13 * Math.sin(t * 0.001 * (1 + (i % 5) * 0.3) + i) + (i % 5 === 0 ? 20 : 0);
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.strokeStyle = rgba(i % 5 === 0 ? GOLD : PALE, 0.1 + 0.1 * Math.sin(t * 0.0013 + i));
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(CX + c * 44, CY + s * 44);
      ctx.lineTo(CX + c * (44 + l), CY + s * (44 + l));
      ctx.stroke();
    }
    glow(ctx, CX, CY, 96, PALE, 0.4);
    ctx.globalCompositeOperation = 'source-over';
    const g2 = ctx.createRadialGradient(CX - 8, CY - 10, 2, CX, CY, 40);
    g2.addColorStop(0, '#fff');
    g2.addColorStop(0.7, '#e9e8e2');
    g2.addColorStop(1, '#8d8f8d');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(CX, CY, 38, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(BONE, 0.6);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(CX, CY, 48, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([1, 5]);
    ctx.strokeStyle = rgba(GOLD, 0.7);
    ctx.beginPath();
    ctx.arc(CX, CY, 62, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    /* ⑩ 行星（在核心前方的后画） */
    if (this.layers.bodies) {
      for (const b of bodies) if (b.p.z >= 0) this.sphereBody(b.p, b.rad, b.col);
    }

    /* ⑪ 彗星：近核心时尾巴最长，永远背向核心 */
    if (this.layers.bodies) {
      const cp1 = comPos(COM.th);
      const head = PV(cp1.v);
      const dir = norm(cp1.v);
      const len = 40 + 170 * clamp(1 - cp1.r / 360);
      ctx.globalCompositeOperation = 'lighter';
      const NSEG = 26;
      const tails: Array<['ion' | 'dust', number, string, number]> = [
        ['ion', 0, BONE, 1.4],
        ['dust', 0.5, PALE, 3.2],
      ];
      for (const [kind, curve, col, wid] of tails) {
        let prevP = head;
        for (let i = 1; i <= NSEG; i += 1) {
          const u = i / NSEG;
          const off = curve * u * u * len * 0.35;
          const q = P(
            cp1.v[0] + dir[0] * len * u + off * dir[2] * 0.6,
            cp1.v[1] + dir[1] * len * u,
            cp1.v[2] + dir[2] * len * u - off * dir[0] * 0.6,
          );
          ctx.strokeStyle = rgba(col, (1 - u) * (kind === 'ion' ? 0.55 : 0.22));
          ctx.lineWidth = wid * (1 - u * 0.8) * head.s;
          ctx.beginPath();
          ctx.moveTo(prevP.x, prevP.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
          prevP = q;
        }
      }
      glow(ctx, head.x, head.y, 26 * head.s, PALE, 0.9);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.8 * head.s, 0, TAU);
      ctx.fill();
    }
  }

  /** 带盈亏的球体：光从核心(原点)射来，在视图空间里求明暗界线 */
  private sphereBody(p: Proj, rad: number, col: string, rim = 0.5) {
    const ctx = this.ctx;
    const l = Math.hypot(p.vx, p.vy, p.vz) || 1;
    const Lx = -p.vx / l;
    const Ly = -p.vy / l;
    const Lz = -p.vz / l;
    const R = rad * p.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(-Ly, Lx));
    ctx.fillStyle = 'rgba(26,28,32,.96)';
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(col, 1);
    ctx.beginPath();
    ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
    ctx.ellipse(0, 0, Math.max(0.01, R * Math.abs(Lz)), R, 0, Math.PI / 2, -Math.PI / 2, Lz < 0);
    ctx.fill();
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = rgba(col, rim);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}
