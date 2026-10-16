/**
 * 指针光：给所有 .lit 元素写入 --lx/--ly/--la/--lo，驱动玻璃的边缘流光与高光。
 * 全站只挂一个委托监听；rAF 合批；触屏与减少动态效果时不启用（CSS 有静态默认值）。
 */
export function installPointerLight(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let raf = 0;
  let ev: PointerEvent | null = null;
  let active: HTMLElement | null = null;

  const apply = () => {
    raf = 0;
    if (!ev) return;
    const target = (ev.target as Element | null)?.closest?.('.lit') as HTMLElement | null;
    if (active && active !== target) {
      active.style.setProperty('--lo', '0');
    }
    active = target;
    if (!target) return;
    const r = target.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const cx = r.width / 2;
    const cy = r.height / 2;
    const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
    target.style.setProperty('--lx', `${x}px`);
    target.style.setProperty('--ly', `${y}px`);
    target.style.setProperty('--la', `${angle - 40}deg`);
    target.style.setProperty('--lo', '1');
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    ev = e;
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const onLeave = () => {
    if (active) active.style.setProperty('--lo', '0');
    active = null;
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    if (raf) cancelAnimationFrame(raf);
  };
}
