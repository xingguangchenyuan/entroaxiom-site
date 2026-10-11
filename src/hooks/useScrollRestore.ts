import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { SCROLL_PREFIX } from '../config/site';

function read(key: string): number | null {
  try {
    const v = sessionStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

function write(key: string, value: number): void {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    /* 隐私模式下忽略 */
  }
}

/**
 * 列表返回状态恢复（设计文档 §13）
 * - 路由变化时：先把当前页滚动位置按 pathname 存档，再在新路由恢复
 *   （有存档则恢复，无存档回到顶部）；
 * - 页面隐藏（切后台/关页）时也存档，防止丢失。
 */
export function useScrollRestore(): void {
  const location = useLocation();
  const prevPath = useRef<string>(location.pathname);

  useEffect(() => {
    const from = prevPath.current;
    const to = location.pathname;
    if (from !== to) {
      write(`${SCROLL_PREFIX}${from}`, window.scrollY);
      const saved = read(`${SCROLL_PREFIX}${to}`);
      if (saved !== null && Number.isFinite(saved)) {
        requestAnimationFrame(() => window.scrollTo(0, saved));
      } else {
        window.scrollTo(0, 0);
      }
      prevPath.current = to;
    }
  }, [location.pathname]);

  useEffect(() => {
    const save = () => write(`${SCROLL_PREFIX}${location.pathname}`, window.scrollY);
    window.addEventListener('pagehide', save);
    window.addEventListener('visibilitychange', save);
    return () => {
      window.removeEventListener('pagehide', save);
      window.removeEventListener('visibilitychange', save);
    };
  }, [location.pathname]);
}