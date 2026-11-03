import { useEffect, useRef, useState } from 'react';
import { FRAG, VERT } from './shaders';
import { getPulseAt, getSkyMode, getSkyTint, subscribeSky, type SkyMode } from './skyStore';

/**
 * 常驻背景：一块全屏 WebGL 画布，画一个黑洞与星空。
 *  - 页面只声明“姿态”（welcome / home / calm），画布在姿态之间平滑过渡（指数平滑，不是补间动画）
 *  - 首页随滚动从 home 姿态过渡到更暗更小的姿态，让正文始终可读
 *  - 降级：无 WebGL → 纯 CSS 星空；减少动态效果 → 只渲染静止帧；页面隐藏 → 暂停；
 *    掉帧 → 自动降低渲染分辨率；上下文丢失 → 等待恢复后重建
 */

/* 坐标约定：原点在画布左下角（与着色器一致），cy 越大越靠上 */
interface Look {
  cx: number; cy: number; rs: number; q: number; disk: number; stars: number; neb: number; dim: number;
}
const KEYS: (keyof Look)[] = ['cx', 'cy', 'rs', 'q', 'disk', 'stars', 'neb', 'dim'];

const LAND: Record<SkyMode | 'deep', Look> = {
  welcome: { cx: 0.5, cy: 0.5, rs: 0.15, q: 0.2, disk: 1, stars: 1, neb: 1, dim: 1 },
  home: { cx: 0.73, cy: 0.5, rs: 0.105, q: 0.2, disk: 1, stars: 1, neb: 1, dim: 1 },
  deep: { cx: 0.9, cy: 0.84, rs: 0.055, q: 0.2, disk: 0.55, stars: 0.8, neb: 0.7, dim: 0.5 },
  calm: { cx: 0.92, cy: 0.88, rs: 0.045, q: 0.2, disk: 0.45, stars: 0.85, neb: 1.0, dim: 0.62 },
};
const PORT: Record<SkyMode | 'deep', Look> = {
  welcome: { cx: 0.5, cy: 0.42, rs: 0.17, q: 0.2, disk: 1, stars: 1, neb: 1, dim: 1 },
  home: { cx: 0.5, cy: 0.3, rs: 0.14, q: 0.2, disk: 1, stars: 1, neb: 1, dim: 1 },
  deep: { cx: 0.5, cy: 0.92, rs: 0.09, q: 0.2, disk: 0.5, stars: 0.8, neb: 0.7, dim: 0.46 },
  calm: { cx: 0.86, cy: 0.94, rs: 0.075, q: 0.2, disk: 0.45, stars: 0.85, neb: 1.0, dim: 0.58 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function targetFor(mode: SkyMode, portrait: boolean, scrollProgress: number): Look {
  const T = portrait ? PORT : LAND;
  if (mode !== 'home' || scrollProgress <= 0) return T[mode];
  const a = T.home;
  const b = T.deep;
  const out = { ...a };
  for (const k of KEYS) out[k] = lerp(a[k], b[k], scrollProgress);
  return out;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? '';
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

interface Gfx {
  gl: WebGLRenderingContext;
  u: Record<string, WebGLUniformLocation | null>;
}

function init(canvas: HTMLCanvasElement): Gfx | null {
  // low-power：背景只是装饰，在双显卡笔记本上交给集显即可，不必唤醒独显
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) return null;
  try {
    const pr = gl.createProgram();
    if (!pr) return null;
    gl.attachShader(pr, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const names = ['uRes', 'uTime', 'uCenter', 'uRs', 'uQ', 'uDisk', 'uStars', 'uNeb', 'uPar', 'uFlash', 'uDim', 'uTint'];
    const u: Gfx['u'] = {};
    for (const n of names) u[n] = gl.getUniformLocation(pr, n);
    return { gl, u };
  } catch {
    return null;
  }
}

const SCALES = [1, 0.8, 0.65, 0.5];

/**
 * 各姿态的渲染倍率（相对 dprCap）
 *  - calm  黑洞缩在角落、只剩背景，0.62 足够
 *  - home/welcome 不在这里收窄，交给下面的每帧像素预算
 */
const modeScale = (mode: SkyMode): number => (mode === 'calm' ? 0.62 : 1);

/**
 * 每帧像素预算 —— 天空成本只跟“这一帧画了多少像素”成正比。
 *
 * 片元着色器每像素约 110 次 hash，外加三次 fbm、三次 fbmp 和若干 exp/pow。这台 Intel
 * UHD 上：1418×761（108 万像素）单帧十几毫秒，几乎吃掉整个 16.7ms 帧预算，于是持续
 * 掉帧 —— 星盘旋转一眼能看出顿，文字模糊显现也跟着顿；22 万像素则稳稳 60fps。
 * 所以钳的是像素数而不是倍率：窗口多大、屏是 1x 还是 1.5x，都不会意外超支。
 * 50 万（约 900×560）留出一半预算给合成、SVG 星盘和交互。
 */
const PIXEL_BUDGET = 500_000;
/**
 * 帧率上限。黑洞与星云的角速度极低（吸积盘内侧约 0.37 rad/s，30fps 下每帧约 0.7°，
 * 60fps 下 0.35°），肉眼无法区分，但 GPU 每帧要跑约 110 次 hash 的片元着色器 ——
 * 减半帧数就减半占用，滚动时主线程能抢到更多时间。
 */
const FRAME_MS = 1000 / 30;
/**
 * 按场景再降一档：
 *  - 平静态（读文章 / 列表页：黑洞缩在角落、画面已稳定）降到 15fps —— 盘面角速度本来就低，肉眼看不出，
 *    GPU 占用直接减半。一旦有过渡（切姿态、换色调、鼠标视差）立刻回到 30fps，稳定后再降。
 *  - 窗口没有焦点（用户在别的窗口里工作，这页只是挂在旁边）降到 12fps。
 * 帧率策略只影响“多久画一帧”；动画按真实时间积分，速度不变。
 */
const CALM_FRAME_MS = 1000 / 15;
const UNFOCUSED_FRAME_MS = 1000 / 12;
/** 帧率策略的重算间隔：不必每个 rAF 都算 */
const POLICY_REFRESH_MS = 250;
/** 平均帧间隔超过“本应有的间隔”这么多倍，才算掉帧（原先的 42ms ÷ 33.3ms） */
const SLOW_RATIO = 1.26;
/**
 * 首页滚过 hero 之后黑洞已经缩进角落、亮度降到一半，此后按 0.8 倍分辨率渲染，
 * 省下 36% 的像素。带滞回（0.7 进入 / 0.5 退出），避免卡在阈值上反复重建帧缓冲。
 */
const DEEP_IN = 0.7;
const DEEP_OUT = 0.5;

export function SkyCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let gfx = init(canvas);
    if (!gfx) {
      setFailed(true);
      return;
    }

    let raf = 0;
    let running = false;
    let lost = false;
    let last = performance.now();
    let elapsed = reduced ? 3.0 : 0;
    let scaleIdx = 0;
    /** 自适应降采样的统计窗口：累计帧间隔与帧数 */
    let winMs = 0;
    let winExpected = 0;
    let winN = 0;
    /** 当前帧率策略对应的帧间隔（定期重算，见 POLICY_REFRESH_MS） */
    let frameMs = FRAME_MS;
    let policyAt = -Infinity;
    let frames = 0;
    let sized = '';
    /** 首页已滚过 hero：画布改用降采样分辨率 */
    let lowRes = false;

    const portraitNow = () => window.innerWidth / Math.max(1, window.innerHeight) < 0.85;
    const scrollProgress = () => clamp01(window.scrollY / Math.max(1, window.innerHeight * 0.8));

    const cur: Look = { ...targetFor(getSkyMode(), portraitNow(), getSkyMode() === 'home' ? scrollProgress() : 0) };
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollP = scrollProgress();
    const tint = [...getSkyTint()];

    const resize = () => {
      const mode = getSkyMode();
      const dprCap = Math.min(window.devicePixelRatio || 1, 1.5);
      if (mode !== 'home') {
        lowRes = false;
      } else if (!lowRes && scrollP > DEEP_IN) {
        lowRes = true;
      } else if (lowRes && scrollP < DEEP_OUT) {
        lowRes = false;
      }
      const base = dprCap * modeScale(mode);
      let s = base * SCALES[scaleIdx];
      if (lowRes) s *= 0.8;
      // 每帧像素预算（见 PIXEL_BUDGET）：先按倍率算出想要的尺寸，再按像素数钳住上限
      const area = window.innerWidth * Math.max(1, window.innerHeight);
      const budgetScale = Math.min(1, Math.sqrt(PIXEL_BUDGET / area));
      s = Math.min(s, budgetScale);
      // 降采样与自适应都不许把有效分辨率压到 1 CSS px 以下，也不许高于像素预算：
      // 1x 屏因此完全不受影响，HiDPI 屏最多退到预算允许的那条线。
      const floor = Math.min(base, budgetScale, 1);
      s = Math.max(s, floor);
      const w = Math.max(2, Math.round(window.innerWidth * s));
      const h = Math.max(2, Math.round(window.innerHeight * s));
      const key = `${w}x${h}`;
      if (key !== sized) {
        canvas.width = w;
        canvas.height = h;
        sized = key;
      }
    };

    const draw = (dt: number) => {
      if (!gfx || lost) return;
      const { gl, u } = gfx;
      resize();
      const mode = getSkyMode();
      scrollP = lerp(scrollP, mode === 'home' ? scrollProgress() : 0, reduced ? 1 : 1 - Math.exp(-dt * 8));
      const tgt = targetFor(mode, portraitNow(), scrollP);
      const k = reduced ? 1 : 1 - Math.exp(-dt * 2.3);
      for (const key of KEYS) cur[key] = lerp(cur[key], tgt[key], k);
      par.x = lerp(par.x, par.tx, reduced ? 0 : 1 - Math.exp(-dt * 3));
      par.y = lerp(par.y, par.ty, reduced ? 0 : 1 - Math.exp(-dt * 3));

      const pulseAge = (performance.now() - getPulseAt()) / 1000;
      const flash = getPulseAt() < 0 || reduced ? 0 : Math.max(0, Math.sin(Math.min(1, pulseAge / 1.8) * Math.PI)) * 0.9;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, elapsed);
      gl.uniform2f(u.uCenter, cur.cx, cur.cy);
      gl.uniform1f(u.uRs, cur.rs);
      gl.uniform1f(u.uQ, cur.q);
      gl.uniform1f(u.uDisk, cur.disk);
      gl.uniform1f(u.uStars, cur.stars);
      gl.uniform1f(u.uNeb, cur.neb);
      gl.uniform2f(u.uPar, par.x, par.y);
      gl.uniform1f(u.uFlash, flash);
      gl.uniform1f(u.uDim, cur.dim);
      const tt = getSkyTint();
      for (let i = 0; i < 3; i++) tint[i] = lerp(tint[i], tt[i], reduced ? 1 : 1 - Math.exp(-dt * 1.6));
      gl.uniform3f(u.uTint, tint[0], tint[1], tint[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const settled = () => {
      const tgt = targetFor(getSkyMode(), portraitNow(), scrollP);
      const tt = getSkyTint();
      return tint.every((v, i) => Math.abs(v - tt[i]) < 0.002) && KEYS.every((k) => Math.abs(cur[k] - tgt[k]) < 0.0008) && Math.abs(par.x - par.tx) < 0.001 && Math.abs(par.y - par.ty) < 0.001;
    };

    const policy = (): number => {
      if (!document.hasFocus()) return UNFOCUSED_FRAME_MS;
      if (getSkyMode() === 'calm' && settled()) return CALM_FRAME_MS;
      return FRAME_MS;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!running) return;
      if (now - policyAt > POLICY_REFRESH_MS) {
        policyAt = now;
        frameMs = policy();
      }
      // 帧率上限（30 / 15 / 12fps）：跳掉多余的 rAF 回调，但时间戳仍用“上次真正绘制”的时刻，动画速度不变
      if (now - last < frameMs - 1) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const rawDt = (now - last) / 1000;
      const dt = Math.min(0.1, rawDt);
      last = now;
      elapsed += reduced ? 0 : dt;
      draw(dt);
      // 自适应分辨率：按“最近一个窗口的平均帧间隔”判断，而不是逐帧阈值 ——
      // 这台机器上首页的表现是「33ms 正常帧 + 每 6~7 帧一次 200ms 长停顿」，
      // 逐帧计数会在长停顿后立刻被下一帧抵消，永远攒不够，等于没生效。
      // 平均间隔超过期望值的 1.26 倍（30fps 档即 ≈42ms）才降一档；降采样有 1 CSS px 下限，见 resize()。
      frames++;
      if (frames > 30) {
        // 用未夹紧的真实间隔统计：200ms 的停顿不该被算成 100ms
        winMs += rawDt * 1000;
        winExpected += frameMs;
        winN++;
        if (winN >= 45) {
          // 和“本应有的间隔”比，而不是和固定的 42ms 比：平静态本来就是 15fps（66ms），不能因此误判为掉帧
          if (winMs > winExpected * SLOW_RATIO && scaleIdx < SCALES.length - 1) {
            scaleIdx++;
            // 机器吃力：让样式层也一起降档（关掉毛玻璃的实时模糊，见 glass.css 的 data-perf）
            document.documentElement.dataset.perf = 'low';
          }
          winMs = 0;
          winExpected = 0;
          winN = 0;
        }
      }
      if (reduced && settled()) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || document.hidden || lost) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    draw(0.016);
    setReady(true);
    start();

    const onVis = () => (document.hidden ? stop() : start());
    const onResize = () => {
      sized = '';
      if (!running) start();
    };
    const onScroll = () => {
      if (!running) start();
    };
    const onPointer = (e: PointerEvent) => {
      par.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      par.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
      if (!running) start();
    };
    const unsub = subscribeSky(() => start());
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      stop();
    };
    const onRestored = () => {
      gfx = init(canvas);
      sized = '';
      lost = !gfx;
      if (gfx) {
        draw(0.016);
        start();
      } else {
        setFailed(true);
      }
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      stop();
      unsub();
      document.removeEventListener('visibilitychange', onVis);
      delete document.documentElement.dataset.perf; // 卸载后不再保留「低档」标记（StrictMode 重挂载会重新判定）
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, []);

  return (
    <div className="sky" aria-hidden="true" data-failed={failed ? '1' : undefined}>
      <div className="sky__fallback" />
      {!failed && <canvas ref={ref} className="sky__canvas" data-ready={ready ? '1' : undefined} />}
      <div className="sky__grain" />
    </div>
  );
}
