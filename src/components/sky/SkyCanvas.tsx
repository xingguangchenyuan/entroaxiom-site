import { useEffect, useRef, useState } from 'react';
import { FRAG, VERT } from './shaders';
import { getPulseAt, getSkyMode, subscribeSky, type SkyMode } from './skyStore';

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
  calm: { cx: 0.92, cy: 0.9, rs: 0.045, q: 0.2, disk: 0.4, stars: 0.75, neb: 0.6, dim: 0.46 },
};
const PORT: Record<SkyMode | 'deep', Look> = {
  welcome: { cx: 0.5, cy: 0.42, rs: 0.17, q: 0.2, disk: 1, stars: 1, neb: 1, dim: 1 },
  home: { cx: 0.5, cy: 0.3, rs: 0.14, q: 0.2, disk: 1, stars: 1, neb: 1, dim: 1 },
  deep: { cx: 0.5, cy: 0.92, rs: 0.09, q: 0.2, disk: 0.5, stars: 0.8, neb: 0.7, dim: 0.46 },
  calm: { cx: 0.86, cy: 0.94, rs: 0.075, q: 0.2, disk: 0.4, stars: 0.75, neb: 0.6, dim: 0.42 },
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
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
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
    const names = ['uRes', 'uTime', 'uCenter', 'uRs', 'uQ', 'uDisk', 'uStars', 'uNeb', 'uPar', 'uFlash', 'uDim'];
    const u: Gfx['u'] = {};
    for (const n of names) u[n] = gl.getUniformLocation(pr, n);
    return { gl, u };
  } catch {
    return null;
  }
}

const SCALES = [1, 0.8, 0.65, 0.5];

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
    let slow = 0;
    let frames = 0;
    let sized = '';

    const portraitNow = () => window.innerWidth / Math.max(1, window.innerHeight) < 0.85;
    const scrollProgress = () => clamp01(window.scrollY / Math.max(1, window.innerHeight * 0.8));

    const cur: Look = { ...targetFor(getSkyMode(), portraitNow(), getSkyMode() === 'home' ? scrollProgress() : 0) };
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollP = scrollProgress();

    const resize = () => {
      const dprCap = Math.min(window.devicePixelRatio || 1, 1.5);
      const modeScale = getSkyMode() === 'calm' ? 0.62 : 1;
      const s = dprCap * modeScale * SCALES[scaleIdx];
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
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const settled = () => {
      const tgt = targetFor(getSkyMode(), portraitNow(), scrollP);
      return KEYS.every((k) => Math.abs(cur[k] - tgt[k]) < 0.0008) && Math.abs(par.x - par.tx) < 0.001 && Math.abs(par.y - par.ty) < 0.001;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      elapsed += reduced ? 0 : dt;
      const t0 = performance.now();
      draw(dt);
      // 自适应分辨率：连续掉帧就降一档
      const cost = performance.now() - t0 + (dt > 0.034 ? 12 : 0);
      frames++;
      if (frames > 20) {
        slow = cost > 24 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 18 && scaleIdx < SCALES.length - 1) {
          scaleIdx++;
          slow = 0;
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
