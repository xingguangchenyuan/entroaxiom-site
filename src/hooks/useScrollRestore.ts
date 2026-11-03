import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { SCROLL_PREFIX } from '../config/site';
import { restoreScroll, type ScrollEnv } from '../lib/scrollRestore';

/**
 * 通过 <Link state={RESTORE_SCROLL}> 声明“这是返回上一级”的跳转（如文章页的「返回列表」），
 * 即使它是一次 PUSH，也恢复目标页上次的滚动位置。
 */
export const RESTORE_SCROLL = { restoreScroll: true } as const;

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

const browserEnv: ScrollEnv = {
  scrollTo: (y) => window.scrollTo(0, y),
  maxScroll: () => document.documentElement.scrollHeight - window.innerHeight,
  now: () => performance.now(),
  raf: (cb) => requestAnimationFrame(cb),
  caf: (id) => cancelAnimationFrame(id),
};

/** 恢复期间，用户自己动手滚动就立刻放弃恢复，不跟用户抢 */
const USER_INPUT = ['wheel', 'touchstart', 'mousedown', 'keydown'] as const;

/**
 * 滚动位置管理（含列表返回时的位置恢复）
 *
 *  - 位置在滚动时（每帧最多一次）持续写入 sessionStorage，按 pathname 存档。
 *    不再等“路由已经切换”之后才读 scrollY —— 那时旧页面已卸载，页面高度塌缩，读到的是被截断的值。
 *  - 进入新路由：
 *      · 浏览器前进/后退（POP），或链接带 RESTORE_SCROLL 标记 → 恢复该页上次的位置；
 *        内容是异步加载的，等页面够高了再滚（见 lib/scrollRestore.ts）；
 *      · 其他（点导航、点卡片等 PUSH/REPLACE）→ 回到顶部。
 *  - 恢复完成之前不记录位置，避免骨架屏阶段的临时位置覆盖掉存档。
 *  - 接管浏览器的滚动恢复（scrollRestoration = manual），避免两套机制互相打架。
 *  - 只在 pathname 变化时处理；同一页内改查询参数（列表筛选的 replace）不会触发滚动。
 */
export function useScrollRestore(): void {
  const location = useLocation();
  const navType = useNavigationType();
  const { pathname } = location;

  // 用 ref 读取最新的跳转类型与 state：effect 只依赖 pathname，查询参数变化不会重跑
  const navRef = useRef({ navType, state: location.state as unknown, hash: location.hash });
  navRef.current = { navType, state: location.state as unknown, hash: location.hash };
  const firstRun = useRef(true);

  useEffect(() => {
    try {
      window.history.scrollRestoration = 'manual';
    } catch {
      /* 个别环境不允许设置 */
    }
  }, []);

  useEffect(() => {
    const key = `${SCROLL_PREFIX}${pathname}`;
    const { navType: type, state, hash } = navRef.current;
    const isFirst = firstRun.current;
    firstRun.current = false;

    let armed = false;
    let cancelRestore: (() => void) | null = null;

    const stopWatchingInput = () => {
      for (const ev of USER_INPUT) window.removeEventListener(ev, onUserInput);
    };
    function onUserInput() {
      cancelRestore?.();
    }
    const finish = () => {
      armed = true;
      stopWatchingInput();
    };

    const wantsRestore =
      type === 'POP' || (typeof state === 'object' && state !== null && (state as { restoreScroll?: unknown }).restoreScroll === true);
    const saved = wantsRestore ? read(key) : null;

    if (saved !== null && Number.isFinite(saved) && saved > 0) {
      for (const ev of USER_INPUT) window.addEventListener(ev, onUserInput, { passive: true });
      cancelRestore = restoreScroll(saved, browserEnv, { onDone: finish });
    } else {
      // 首次加载且地址带 #hash 时不强行回顶，交给浏览器 / 目录去定位
      if (!(isFirst && hash)) window.scrollTo(0, 0);
      armed = true;
    }

    let raf = 0;
    const save = () => {
      if (armed) write(key, window.scrollY);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        save();
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelRestore?.();
      stopWatchingInput();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);
}
