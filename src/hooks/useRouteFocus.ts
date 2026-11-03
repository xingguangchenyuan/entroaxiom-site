import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** 新页面的 <main> 最多等多久（懒加载分块 / 异步数据可能还没到） */
const WAIT_MS = 3000;

/**
 * 路由切换后把焦点移到新页面的 <main>。
 *
 * 单页应用换页时浏览器不会像整页刷新那样重置焦点：键盘用户的焦点会留在已经不存在的旧链接上，
 * 读屏用户也听不到“换页了”。把焦点交给新页面的主区域，既让读屏读出页面内容，
 * 也让下一次 Tab 从正文开始，而不是回到页面最顶端。
 *
 *  - 首次加载不处理（不抢首屏焦点）；
 *  - 只在 pathname 变化时处理（列表页改筛选条件不会抢走搜索框的焦点）；
 *  - enabled 为 false（欢迎层显示期间）时不处理；
 *  - 新页面是懒加载的，<main> 可能稍后才出现，逐帧等待，超时放弃；
 *  - preventScroll：滚动位置交给 useScrollRestore 管。
 */
export function useRouteFocus(enabled: boolean): void {
  const { pathname } = useLocation();
  const first = useRef(true);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabledRef.current) return;

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const main = document.querySelector<HTMLElement>('.route main[tabindex="-1"]');
      if (main) {
        main.focus({ preventScroll: true });
        return;
      }
      if (performance.now() - start < WAIT_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);
}
