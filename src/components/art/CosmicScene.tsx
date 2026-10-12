import { useEffect, useRef } from 'react';

export type CosmicSceneName = 'armillary' | 'lens' | 'horizon' | 'corona' | 'edgeon';
const TAU = Math.PI * 2;
const bone = '#e9e8e2';
const gold = '#e5bf32';

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ring(ctx: CanvasRenderingContext2D, radius: number, color: string, alpha: number, dash: number[] = []) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(400, 400, radius, 0, TAU); ctx.stroke(); ctx.restore();
}
function drawArmillary(ctx: CanvasRenderingContext2D, time: number) {
  // Adapted from v5's projected 3D meridian/ecliptic rings: foreground and background arcs have different light.
  const yaw = time * .00006 + .6, pitch = .5 + .07 * Math.sin(time * .00017), F = 1500;
  const project = (x: number, y: number, z: number) => {
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const scale = F / (F - z2);
    return { x: 400 + x1 * scale, y: 400 - y2 * scale, z: z2 };
  };
  ring(ctx, 392, bone, .18); ring(ctx, 397, gold, .3, [1, 9]);
  const trace = (point: (a: number) => [number, number, number], color: string, width: number, front: number, back: number, ticks = 0) => {
    ctx.lineWidth = width; ctx.strokeStyle = color;
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * TAU, b = (i + 1) / 180 * TAU;
      const p = project(...point(a)), q = project(...point(b));
      ctx.globalAlpha = (p.z + q.z > 0) ? front : back;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    if (ticks) for (let i = 0; i < ticks; i++) {
      const [x, y, z] = point(i / ticks * TAU), k = i % 10 === 0 ? .95 : .983;
      const p = project(x, y, z), q = project(x * k, y * k, z * k);
      ctx.globalAlpha = p.z > 0 ? front * .7 : back;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  for (let i = 0; i < 6; i++) {
    const az = i * Math.PI / 6;
    trace(a => [300 * Math.cos(a) * Math.cos(az), 300 * Math.sin(a), 300 * Math.cos(a) * Math.sin(az)], bone, .7, .55, .13);
  }
  for (const lat of [-.87, -.41, .41, .87])
    trace(a => [300 * Math.cos(lat) * Math.cos(a), 300 * Math.sin(lat), 300 * Math.cos(lat) * Math.sin(a)], bone, .7, .45, .12);
  for (const radius of [300, 346, 374])
    trace(a => [radius * Math.cos(a), 0, radius * Math.sin(a)], bone, radius === 300 ? 1.3 : .7, .85, .22, radius === 300 ? 180 : 72);
  trace(a => [330 * Math.cos(a) * Math.cos(.41), 330 * Math.cos(a) * Math.sin(.41), 330 * Math.sin(a)], gold, 1.8, .95, .28, 120);
  trace(a => [255 * Math.cos(a) * Math.cos(-.78), 255 * Math.cos(a) * Math.sin(-.78), 255 * Math.sin(a)], bone, .8, .6, .16);
  const poleA = project(0, -440, 0), poleB = project(0, 440, 0);
  ctx.strokeStyle = gold; ctx.globalAlpha = .48; ctx.beginPath(); ctx.moveTo(poleA.x, poleA.y); ctx.lineTo(poleB.x, poleB.y); ctx.stroke(); ctx.globalAlpha = 1;
  const bead = project(330 * Math.cos(time * .00032), 330 * Math.sin(time * .00032) * Math.sin(.41), 330 * Math.sin(time * .00032));
  const halo = ctx.createRadialGradient(bead.x, bead.y, 1, bead.x, bead.y, 38);
  halo.addColorStop(0, '#fff'); halo.addColorStop(.18, 'rgba(229,191,50,.7)'); halo.addColorStop(1, 'rgba(229,191,50,0)');
  ctx.fillStyle = halo; ctx.fillRect(bead.x - 38, bead.y - 38, 76, 76);
  const core = ctx.createRadialGradient(389, 388, 3, 400, 400, 42);
  core.addColorStop(0, '#fff'); core.addColorStop(.7, bone); core.addColorStop(1, '#555b64');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(400, 400, 38, 0, TAU); ctx.fill();
  ring(ctx, 48, bone, .6); ring(ctx, 62, gold, .7, [1, 5]);
}
function drawLens(ctx: CanvasRenderingContext2D) {
  // v5: numerical light-ray integration around a dark mass, Einstein ring and photon dust.
  const rnd = random(202), RS = 30, K = 115;
  for (const angle of [0, Math.PI, Math.PI / 2 + .1, Math.PI * 1.5 + .1]) {
    for (let b = -420; b <= 420; b += 7) {
      if (Math.abs(b) < RS * .8) continue;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      let x = -ca * 540 - sa * b, y = -sa * 540 + ca * b, vx = ca, vy = sa;
      const bright = Math.abs(b) > 56 && Math.abs(b) < 84;
      ctx.strokeStyle = bright ? 'rgba(229,191,50,.48)' : 'rgba(233,232,226,.19)';
      ctx.lineWidth = bright ? .9 : .6; ctx.beginPath(); ctx.moveTo(400 + x, 400 + y);
      for (let i = 0; i < 1100; i++) {
        const d2 = x * x + y * y, d = Math.sqrt(d2);
        if (d < RS) break;
        const a = K / d2;
        vx -= x / d * a; vy -= y / d * a;
        const speed = Math.hypot(vx, vy); vx /= speed; vy /= speed;
        x += vx * 1.7; y += vy * 1.7;
        ctx.lineTo(400 + x, 400 + y);
        if (d > 640 && i > 60) break;
      }
      ctx.stroke();
    }
  }
  for (let i = 0; i < 3600; i++) {
    const a = rnd() * TAU, d = 86 + (rnd() + rnd() + rnd() - 1.5) * 27;
    ctx.fillStyle = rnd() < .4 ? 'rgba(229,191,50,.5)' : 'rgba(233,232,226,.4)';
    ctx.fillRect(400 + Math.cos(a) * d, 400 + Math.sin(a) * d, .7, .7);
  }
  ctx.shadowColor = gold; ctx.shadowBlur = 22;
  ring(ctx, 86, gold, .8); ctx.shadowBlur = 0;
  ctx.fillStyle = '#020205'; ctx.beginPath(); ctx.arc(400, 400, 37, 0, TAU); ctx.fill();
  ring(ctx, 37, bone, .95); ring(ctx, 56, bone, .4); ring(ctx, 120, bone, .2, [3, 6]); ring(ctx, 200, bone, .14, [1, 8]);
  ring(ctx, 326, gold, .35, [1, 7]); ring(ctx, 378, bone, .35);
  for (let i = 0; i < 180; i++) {
    const a = i / 180 * TAU, r = i % 10 ? 5 : 12;
    ctx.globalAlpha = .48; ctx.strokeStyle = bone; ctx.beginPath(); ctx.moveTo(400 + 378 * Math.cos(a), 400 + 378 * Math.sin(a)); ctx.lineTo(400 + (378 - r) * Math.cos(a), 400 + (378 - r) * Math.sin(a)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawHorizon(ctx: CanvasRenderingContext2D) {
  // v6: three tapered ribbon strokes around one absolute black event horizon.
  ctx.strokeStyle = 'rgba(233,232,226,.48)'; ctx.beginPath(); ctx.moveTo(8, 400); ctx.lineTo(792, 400); ctx.stroke();
  const ribbon = (radius: number, start: number, end: number, width: number, color: string) => {
    const outer: [number, number][] = [], inner: [number, number][] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100, a = start + (end - start) * t, w = width * Math.pow(Math.sin(Math.PI * t), 1.5) / 2;
      outer.push([400 + (radius + w) * Math.cos(a), 400 + (radius + w) * Math.sin(a)]);
      inner.push([400 + (radius - w) * Math.cos(a), 400 + (radius - w) * Math.sin(a)]);
    }
    ctx.fillStyle = color; ctx.beginPath(); outer.concat(inner.reverse()).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
  };
  ribbon(134, -2.9, .5, 15, bone); ribbon(160, .2, 3.5, 5.5, gold); ribbon(198, -1.3, 1.9, 2, bone);
  ctx.shadowBlur = 30; ctx.shadowColor = gold; ring(ctx, 74, gold, .8); ctx.shadowBlur = 0;
  ring(ctx, 100, bone, .55, [1, 8]); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(400, 400, 66, 0, TAU); ctx.fill(); ring(ctx, 66, bone, .9);
  for (const [x, y, r] of [[662, 204, 10], [118, 560, 7]]) {
    ctx.fillStyle = bone; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * .1, y - r * .1, x + r, y);
    ctx.quadraticCurveTo(x + r * .1, y + r * .1, x, y + r); ctx.quadraticCurveTo(x - r * .1, y + r * .1, x - r, y); ctx.quadraticCurveTo(x - r * .1, y - r * .1, x, y - r); ctx.fill();
  }
}
function drawEdgeon(ctx: CanvasRenderingContext2D) {
  // v6: edge-on point-cloud galaxy, dust lane and a marked observer position.
  const rnd = random(12);
  ctx.save(); ctx.translate(400, 400); ctx.rotate(-.3);
  for (let i = 0; i < 105000; i++) {
    const x = (rnd() < .5 ? -1 : 1) * -Math.log(1 - rnd() * .985) * 105;
    if (Math.abs(x) > 345) continue;
    const bulge = Math.exp(-x * x / (2 * 62 * 62));
    const warp = 10 * Math.sin(x / 110 + 1) * Math.min(1, Math.abs(x) / 200);
    const y = ((rnd() + rnd() + rnd() + rnd() - 2) * 1.73) * (4 + 36 * bulge) + warp;
    if (Math.abs(y - warp - 2) < 3 && Math.abs(x) > 50 && rnd() < .85) continue;
    if (bulge > .12 && rnd() < .6 * bulge) continue;
    ctx.fillStyle = bulge > rnd() * .95 ? `rgba(255,226,150,${.06 + rnd() * .24})` : `rgba(233,232,226,${.1 + rnd() * .6})`;
    const size = .35 + rnd() * .85; ctx.fillRect(x, y, size, size);
  }
  ctx.strokeStyle = '#2fc4d4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(212, 1, 11, 0, TAU); ctx.moveTo(212, -14); ctx.lineTo(212, -73); ctx.stroke();
  ctx.fillStyle = '#2fc4d4'; ctx.beginPath(); ctx.arc(212, 1, 2.2, 0, TAU); ctx.fill(); ctx.restore();
}
function drawCorona(ctx: CanvasRenderingContext2D) {
  // v5's pointillist corona re-colored for this dark personal observatory.
  const rnd = random(303), radius = 112;
  for (let i = 0; i < 130000; i++) {
    const a = rnd() * TAU, d = radius + Math.pow(rnd(), 2.3) * 330;
    const plume = Math.exp(-Math.pow(Math.atan2(Math.sin(a - .35), Math.cos(a - .35)) / .3, 2)) + Math.exp(-Math.pow(Math.atan2(Math.sin(a - 3.3), Math.cos(a - 3.3)) / .3, 2));
    if (rnd() > Math.min(1, (.15 + plume) * Math.pow(radius / d, 1.5))) continue;
    ctx.fillStyle = rnd() < .35 ? 'rgba(229,191,50,.65)' : 'rgba(233,232,226,.55)';
    ctx.fillRect(400 + Math.cos(a) * d, 400 + Math.sin(a) * d, .7, .7);
  }
  ctx.fillStyle = '#03040a'; ctx.beginPath(); ctx.arc(400, 400, radius, 0, TAU); ctx.fill();
  ctx.shadowColor = gold; ctx.shadowBlur = 23; ring(ctx, radius + 2, gold, .9); ctx.shadowBlur = 0;
  ring(ctx, 156, bone, .3, [1, 6]); ring(ctx, 228, bone, .22, [1, 8]); ring(ctx, 306, bone, .18, [1, 10]);
}

const painters: Record<CosmicSceneName, (ctx: CanvasRenderingContext2D, time: number) => void> = {
  armillary: drawArmillary, lens: drawLens, horizon: drawHorizon, corona: drawCorona, edgeon: drawEdgeon,
};

/** Native Canvas art, not a pre-rendered image. RAF runs only while the armillary is visible. */
export function CosmicScene({ scene, className = '' }: { scene: CosmicSceneName; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, visible = false, active = true;
    const shouldAnimate = () => active && visible && !document.hidden && !motion.matches && scene === 'armillary';
    const render = (time: number) => {
      ctx.clearRect(0, 0, 800, 800);
      painters[scene](ctx, time);
      if (shouldAnimate()) frame = requestAnimationFrame(render);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !document.hidden) render(motion.matches ? 0 : performance.now());
    });
    const onMotion = () => { cancelAnimationFrame(frame); if (visible && !document.hidden) render(motion.matches ? 0 : performance.now()); };
    const onVisibility = () => { cancelAnimationFrame(frame); if (visible && !document.hidden) render(motion.matches ? 0 : performance.now()); };
    observer.observe(canvas);
    motion.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { active = false; cancelAnimationFrame(frame); observer.disconnect(); motion.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); };
  }, [scene]);
  return <canvas ref={ref} width={800} height={800} className={`cosmic-scene ${className}`} aria-hidden="true" />;
}
