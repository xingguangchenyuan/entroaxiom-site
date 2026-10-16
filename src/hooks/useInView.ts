import { useCallback, useEffect, useState } from 'react';

/**
 * 元素进入视口后 seen 变为 true（只触发一次）。不支持 IntersectionObserver 时直接视为已进入。
 *
 * 返回的是「回调 ref」而不是对象 ref：元素可能晚于组件本身挂载（例如数据加载完才渲染出来），
 * 对象 ref + 固定依赖的 effect 在那种情况下永远拿不到元素，观察器就永远不会绑上。
 * 回调 ref 把元素存进 state，元素一出现 effect 就会重新运行。
 */
export function useInView<T extends HTMLElement>(threshold = 0.3): [(el: T | null) => void, boolean] {
  const [el, setEl] = useState<T | null>(null);
  const [seen, setSeen] = useState(false);
  const ref = useCallback((node: T | null) => setEl(node), []);

  useEffect(() => {
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (items) => {
        if (items.some((i) => i.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el, seen, threshold]);

  return [ref, seen];
}
