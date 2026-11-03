/**
 * 星核：一颗小小的星盘。
 *
 * 取自 core-glow.html 的生成逻辑（同一套固定种子粒子、旋臂、日冕、四角星耀斑），
 * 拆成两张**预渲染图**，每帧只做两次 drawImage：
 *   1) disc  —— 星盘本体（粒子 + 旋臂柔光 + 亮星），每帧按倾斜角做一次旋转绘制；
 *   2) light —— 外晕 + 日冕 + 48 道细光芒 + 四角星耀斑 + 亮核，不旋转。
 * 所以帧率只跟两次贴图有关，跟粒子数无关；粒子数在 build() 里一次性烧进图里。
 *
 * 角度与星系轨道面一致：倾角用 SQUASH、整体转角用 TILT（由调用方传入），
 * 于是星盘和五条行星轨道躺在同一个平面上。
 */

/** 原文件内部坐标：800×800，中心 400 */
const S = 800;
const C = S / 2;

/**
 * 「光」那张图比原文件的 800×800 大这么多倍：四角星耀斑要伸到星盘外面去才看得见，
 * 原来的 800 见方装不下拉长后的光芒。图案本身的比例不变，只是画布多留出一圈。
 */
const LIGHT_SPAN = 1.6;
const CL = (S * LIGHT_SPAN) / 2;
/** 耀斑相对原文件拉长的倍数（竖向最长，横向次之，斜向很淡） */
const FLARE_STRETCH = 1.75;

export interface CoreGlowOptions {
  /** 粒子数，默认 16000（一次性成本，不影响帧率） */
  count?: number;
  /** 随机种子，固定则每次一致 */
  seed?: number;
  /** 旋臂数 */
  arms?: number;
  /** 星盘自转：圈/秒 */
  spin?: number;
}

/**
 * 星盘自转速度：原文件 spin = 1/260 圈/秒，即 260 秒转一圈。
 * 慢到几乎察觉不到，但它让星盘有「活着」的呼吸感。
 */
const SPIN_PER_SEC = 1 / 260;

/** 种子随机数（与原文件同款 mulberry32） */
function makeRnd(seed0: number): () => number {
  let seed = seed0 | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** 暖白 / 金 / 琥珀 / 淡蓝 */
const PAL: [number, number, number][] = [
  [255, 241, 210],
  [250, 208, 130],
  [232, 160, 92],
  [196, 212, 255],
];

interface Particle {
  r: number;
  a: number;
  s: number;
  al: number;
  ci: number;
  tw: number;
}

export class CoreGlow {
  private disc: HTMLCanvasElement | null = null;
  private light: HTMLCanvasElement | null = null;
  private builtHalf = 0;
  private builtDpr = 0;
  private readonly count: number;
  private readonly seed: number;
  private readonly arms: number;
  private readonly spin: number;

  constructor(opts: CoreGlowOptions = {}) {
    this.count = opts.count ?? 16000;
    this.seed = opts.seed ?? 7;
    this.arms = opts.arms ?? 2;
    this.spin = opts.spin ?? SPIN_PER_SEC;
  }

  /** 预渲染两张图。half = 图案半径（css px） */
  private build(half: number, dpr: number): void {
    this.builtHalf = half;
    this.builtDpr = dpr;
    // 多留一点余量，缩放后仍然锐利；上限 2.4 倍避免大屏上一次性生成太慢
    const K = clamp((half * 2 * dpr * 1.4) / S, 0.6, 2.4);
    const PX = Math.round(S * K);
    // 一个「逻辑单位」等于多少设备像素。原图案是按 900px 宽的画布设计的，
    // 放到星核这个尺寸（约 120px）时，点径和发丝线会被缩成亚像素而消失，
    // 所以下面这两类「点状/线状」元素按设备像素补偿，面积类（半径、光晕）仍按比例。
    const unit = (half * 2 * dpr) / S;
    /** 逻辑尺寸 → 逻辑单位，但保证在屏幕上至少有 minPx 个设备像素 */
    const pxFloor = (logical: number, minPx: number) => Math.max(logical, minPx / unit);
    /** 粒子直径：0.5~2.5 逻辑单位映射到 0.75~2.2 设备像素 */
    const dotSize = (s0: number) => Math.max((s0 / 2.5) * 2.2, 0.75) / unit;

    /* ---------- 粒子（与原文件同一套分布） ---------- */
    const rnd = makeRnd(this.seed);
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.73;
    const R_IN = 26;
    const R_OUT = 340;
    const PITCH = 1.55;
    const P: Particle[] = [];
    for (let i = 0; i < this.count; i += 1) {
      let r: number;
      let a: number;
      const k = rnd();
      if (k < 0.14) {
        r = R_IN + Math.abs(gauss()) * 44;
        a = rnd() * Math.PI * 2;
      } else if (k < 0.38) {
        r = R_IN + (R_OUT - R_IN) * Math.pow(rnd(), 1.25);
        a = rnd() * Math.PI * 2;
      } else {
        const u = Math.pow(rnd(), 1.35);
        r = R_IN + (R_OUT - R_IN) * u;
        const arm = ((rnd() * this.arms) | 0) * ((Math.PI * 2) / this.arms);
        a = arm + PITCH * Math.log(r / R_IN) + gauss() * (0.16 + 0.2 * u);
      }
      const t = (r - R_IN) / (R_OUT - R_IN);
      const g = rnd();
      const ci = g < 0.1 ? 3 : t < 0.25 ? (g < 0.65 ? 0 : 1) : t < 0.6 ? (g < 0.5 ? 1 : 2) : g < 0.55 ? 2 : 1;
      const fall = Math.pow(1 - t, 1.15);
      P.push({
        r,
        a,
        s: dotSize(0.5 + Math.pow(rnd(), 3) * 2),
        al: Math.min(1, (0.3 + 0.8 * rnd()) * (0.4 + 0.9 * fall) * (t < 0.08 ? 0.55 + t * 5 : 1)),
        ci,
        tw: rnd() < 0.16 ? rnd() * Math.PI * 2 : -1,
      });
    }
    const buckets = PAL.map((_, ci) => P.filter((p) => p.ci === ci && p.tw < 0));
    const spark = P.filter((p) => p.tw >= 0).slice(0, 460);

    /* ---------- 旋臂柔光用的软圆精灵（只在 build 时用） ---------- */
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    {
      const x = sprite.getContext('2d');
      if (x) {
        const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,214,150,1)');
        g.addColorStop(0.3, 'rgba(255,196,128,.42)');
        g.addColorStop(0.65, 'rgba(250,170,110,.1)');
        g.addColorStop(1, 'rgba(240,160,100,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 64, 64);
      }
    }
    const haze: { r: number; a: number; sz: number; al: number }[] = [];
    for (let j = 0; j < this.arms; j += 1) {
      for (let i = 0; i < 64; i += 1) {
        const u = i / 63;
        const r = R_IN + (R_OUT - R_IN) * Math.pow(u, 1.1);
        const a = j * ((Math.PI * 2) / this.arms) + PITCH * Math.log(r / R_IN);
        haze.push({ r, a, sz: 30 + r * 0.17, al: 0.042 * Math.pow(1 - u, 1.4) + 0.003 });
      }
    }

    /* ---------- ① 星盘：粒子 + 旋臂柔光 + 亮星，全部烧进一张图 ---------- */
    const disc = document.createElement('canvas');
    disc.width = disc.height = PX;
    const dx = disc.getContext('2d');
    if (dx) {
      dx.setTransform(K, 0, 0, K, 0, 0);
      dx.globalCompositeOperation = 'lighter';
      for (const h of haze) {
        dx.globalAlpha = h.al;
        dx.drawImage(sprite, C + Math.cos(h.a) * h.r - h.sz, C + Math.sin(h.a) * h.r - h.sz, h.sz * 2, h.sz * 2);
      }
      for (let b = 0; b < buckets.length; b += 1) {
        const c = PAL[b];
        dx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        for (const p of buckets[b]) {
          dx.globalAlpha = p.al;
          dx.fillRect(C + Math.cos(p.a) * p.r, C + Math.sin(p.a) * p.r, p.s, p.s);
        }
      }
      // 亮星也预渲染：省掉每帧 460 次 fillRect（闪烁在中心这个小尺寸上看不出来）
      dx.fillStyle = 'rgb(255,244,214)';
      for (const p of spark) {
        dx.globalAlpha = Math.min(1, p.al * 1.15);
        dx.fillRect(C + Math.cos(p.a) * p.r, C + Math.sin(p.a) * p.r, p.s * 1.1, p.s * 1.1);
      }
    }

    /* ---------- ② 光：外晕 + 日冕 + 光芒 + 耀斑 + 亮核，不旋转 ---------- */
    const light = document.createElement('canvas');
    const PXL = Math.round(S * LIGHT_SPAN * K);
    light.width = light.height = PXL;
    const lx = light.getContext('2d');
    if (lx) {
      lx.setTransform(K, 0, 0, K, 0, 0);
      lx.globalCompositeOperation = 'lighter';

      const radial = (r: number, stops: [number, string][]) => {
        const g = lx.createRadialGradient(CL, CL, 0, CL, CL, r);
        for (const [o, c] of stops) g.addColorStop(o, c);
        lx.fillStyle = g;
        lx.fillRect(CL - r, CL - r, r * 2, r * 2);
      };

      // 外层光晕
      radial(S * 0.52, [
        [0, 'rgba(255,196,120,.16)'],
        [0.35, 'rgba(230,150,90,.07)'],
        [1, 'rgba(200,120,80,0)'],
      ]);

      // 日冕中层泛光
      radial(150, [
        [0, 'rgba(255,236,190,.55)'],
        [0.25, 'rgba(255,205,125,.28)'],
        [0.6, 'rgba(235,150,85,.08)'],
        [1, 'rgba(220,120,70,0)'],
      ]);

      // 48 道细光芒
      lx.lineCap = 'round';
      for (let i = 0; i < 48; i += 1) {
        const a = (i / 48) * Math.PI * 2;
        const big = i % 6 === 0;
        const l0 = 15;
        const l1 = l0 + (big ? 64 : 30) * (0.7 + 0.5) + (i % 2 ? 0 : 10);
        const c = Math.cos(a);
        const s = Math.sin(a);
        const g = lx.createLinearGradient(CL + c * l0, CL + s * l0, CL + c * l1, CL + s * l1);
        g.addColorStop(0, `rgba(255,240,200,${big ? 0.5 : 0.3})`);
        g.addColorStop(1, 'rgba(255,200,120,0)');
        lx.strokeStyle = g;
        lx.lineWidth = pxFloor(big ? 1.1 : 0.7, 0.62);
        lx.beginPath();
        lx.moveTo(CL + c * l0, CL + s * l0);
        lx.lineTo(CL + c * l1, CL + s * l1);
        lx.stroke();
      }

      // 四角星耀斑：竖向最长、横向次之、斜向很淡
      const spindle = (L: number, w: number, ang: number, a: number) => {
        lx.save();
        lx.translate(CL, CL);
        lx.rotate(ang);
        const g = lx.createRadialGradient(0, 0, 0, 0, 0, L);
        g.addColorStop(0, `rgba(255,250,232,${0.95 * a})`);
        g.addColorStop(0.12, `rgba(255,228,160,${0.6 * a})`);
        g.addColorStop(0.45, `rgba(255,196,110,${0.2 * a})`);
        g.addColorStop(0.75, `rgba(255,186,100,${0.06 * a})`);
        g.addColorStop(1, 'rgba(255,180,90,0)');
        lx.fillStyle = g;
        lx.beginPath();
        lx.moveTo(0, -L);
        lx.bezierCurveTo(w, -L * 0.12, w, L * 0.12, 0, L);
        lx.bezierCurveTo(-w, L * 0.12, -w, -L * 0.12, 0, -L);
        lx.fill();
        lx.restore();
      };
      const fs = FLARE_STRETCH;
      spindle(300 * fs, 7.5 * 1.7, 0, 1);
      spindle(205 * fs, 5.5 * 1.7, Math.PI / 2, 0.95);
      spindle(96 * fs, 3.2 * 1.2, Math.PI / 4, 0.5);
      spindle(96 * fs, 3.2 * 1.2, -Math.PI / 4, 0.5);

      // 内核：由外向内变亮，最里面纯白
      radial(84, [
        [0, 'rgba(255,252,240,.95)'],
        [0.3, 'rgba(255,226,160,.6)'],
        [1, 'rgba(255,180,100,0)'],
      ]);
      lx.globalCompositeOperation = 'source-over';
      const cg = lx.createRadialGradient(CL - 2, CL - 2, 0, CL, CL, 15);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.6, '#fff3d2');
      cg.addColorStop(1, '#ffd68a');
      lx.fillStyle = cg;
      lx.beginPath();
      lx.arc(CL, CL, 14.5, 0, Math.PI * 2);
      lx.fill();
    }

    this.disc = disc;
    this.light = light;
  }

  /**
   * 画到目标画布上。
   * @param half 图案半径（css px）：整张 800×800 的图缩放到 2*half 见方
   * @param timeSec 用于自转与呼吸（秒）
   * @param tilt 星盘倾斜（压扁比，与轨道面一致）
   * @param tiltAngle 星盘整体转角（与轨道面一致）
   * @param alpha 整体不透明度（用于入场渐显）
   */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    half: number,
    dpr: number,
    timeSec: number,
    tilt: number,
    tiltAngle: number,
    alpha: number,
  ): void {
    if (half <= 0 || alpha <= 0.01) return;
    if (!this.disc || !this.light || Math.abs(half - this.builtHalf) > 0.5 || Math.abs(dpr - this.builtDpr) > 0.01) {
      this.build(half, dpr);
    }
    const disc = this.disc;
    const light = this.light;
    if (!disc || !light) return;

    const rot = timeSec * this.spin * Math.PI * 2;
    // 原文件 breath 用毫秒：1 + .05*sin(t*.0009)，换成秒即 0.9/秒
    const breath = 1 + 0.02 * Math.sin(timeSec * 0.9);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;

    // ① 星盘：一次「旋转 + 压扁」的贴图
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tiltAngle);
    ctx.scale(1, tilt);
    ctx.rotate(rot);
    ctx.drawImage(disc, -half, -half, half * 2, half * 2);
    ctx.restore();

    // ② 光：不旋转，只按呼吸微微缩放
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(breath, breath);
    const hl = half * LIGHT_SPAN;
    ctx.drawImage(light, -hl, -hl, hl * 2, hl * 2);
    ctx.restore();

    ctx.restore();
  }
}
