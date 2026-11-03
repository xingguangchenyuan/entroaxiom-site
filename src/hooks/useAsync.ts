import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

/**
 * 异步加载 + 重试。deps 变化时重新加载；组件卸载后的结果会被丢弃。
 * peek：可选，同步读缓存。命中时直接是 ready 状态（挂载和 deps 变化时都不闪骨架）；
 * 数据本身仍会走 fn（fn 内部有缓存，命中时不会真的发请求）。
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[],
  peek?: () => T | undefined,
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>(() => {
    const hit = peek?.();
    return hit !== undefined ? { status: 'ready', data: hit } : { status: 'loading' };
  });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    const hit = peek?.();
    if (hit !== undefined) setState((prev) => (prev.status === 'ready' && prev.data === hit ? prev : { status: 'ready', data: hit }));
    else setState({ status: 'loading' });
    fn()
      .then((data) => alive && setState((prev) => (prev.status === 'ready' && prev.data === data ? prev : { status: 'ready', data })))
      .catch((error: unknown) => alive && setState({ status: 'error', error }));
    return () => {
      alive = false;
    };
    // fn / peek 每次渲染都是新函数，只按 deps 触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}
