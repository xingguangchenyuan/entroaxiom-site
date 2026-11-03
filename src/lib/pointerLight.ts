/**
 * 指针光：给所有 .lit 元素写入 --lx/--ly/--lo，驱动玻璃的边缘流光与高光。
 *  - 全站只挂一个委托监听，rAF 合批，每帧最多写一次
 *  - 命中矩形按「当前悬浮的元素」缓存，只在换目标或滚动/改尺寸时重测：
 *    原来每次 pointermove 都调 getBoundingClientRect()，会在别的代码弄脏布局时被迫同步重算排版
 *  - 触屏与减少动态效果时不启用（CSS 有静态默认值）
 */
export function installPointerLight(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let raf = 0;
  let ev: PointerEvent | null = null;
  let active: HTMLElement | null = null;
  let box: { el: HTMLElement; left: number; top: number } | null = null;

  /** 悬浮目标或页面位置变了，缓存的矩形就作废 */
  const invalidate = () => {
    box = null;
  };

  const apply = () => {
    raf = 0;
    if (!ev) return;
    const target = (ev.target as Element | null)?.closest?.('.lit') as HTMLElement | null;
    if (active && active !== target) active.style.setProperty('--lo', '0');
    active = target;
    if (!target) return;
    if (!box || box.el !== target) {
      const r = target.getBoundingClientRect();
      box = { el: target, left: r.left, top: r.top };
    }
    target.style.setProperty('--lx', `${ev.clientX - box.left}px`);
    target.style.setProperty('--ly', `${ev.clientY - box.top}px`);
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
    box = null;
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  // capture 是为了连内层滚动容器（抽屉、表格横向滚动）一起覆盖
  window.addEventListener('scroll', invalidate, { passive: true, capture: true });
  window.addEventListener('resize', invalidate, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('scroll', invalidate, { capture: true });
    window.removeEventListener('resize', invalidate);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    if (raf) cancelAnimationFrame(raf);
  };
}
