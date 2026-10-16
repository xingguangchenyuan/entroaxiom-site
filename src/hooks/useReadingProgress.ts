import { useEffect, useRef } from 'react';

/**
 * 阅读进度：把 0~1 写进进度条元素的 --p（不触发 React 重渲染）。
 * 进度按“目标元素的顶部到底部”相对于视口计算。
 */
export function useReadingProgress(target: React.RefObject<HTMLElement | null>, bar: React.RefObject<HTMLElement | null>): void {
  const raf = useRef(0);
  useEffect(() => {
    const update = () => {
      raf.current = 0;
      const el = target.current;
      const b = bar.current;
      if (!el || !b) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = total <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / total));
      b.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf.current) raf.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, bar]);
}
