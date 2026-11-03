import { useEffect, useState, useSyncExternalStore } from 'react';
import { loadCorpus, peekCorpus, type Corpus } from '../content/corpus';
import { getContentVersion, invalidateContent, subscribeContentChanges } from '../content/changes';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; corpus: Corpus };

/** 读取全站语料（带缓存）；error 状态可调用 retry 重新请求 */
export function useCorpus(): State & { retry: () => void } {
  const [state, setState] = useState<State>(() => {
    const hit = peekCorpus();
    return hit ? { status: 'ready', corpus: hit } : { status: 'loading' };
  });
  const version = useSyncExternalStore(subscribeContentChanges, getContentVersion);

  useEffect(() => {
    let alive = true;
    // 已有缓存就保持 ready，不先退回 loading
    const hit = peekCorpus();
    setState((prev) => (hit ? (prev.status === 'ready' && prev.corpus === hit ? prev : { status: 'ready', corpus: hit }) : { status: 'loading' }));
    loadCorpus()
      .then((corpus) => alive && setState((prev) => (prev.status === 'ready' && prev.corpus === corpus ? prev : { status: 'ready', corpus })))
      .catch((err: unknown) => alive && setState({ status: 'error', message: err instanceof Error ? err.message : '加载失败' }));
    return () => {
      alive = false;
    };
  }, [version]);

  return { ...state, retry: invalidateContent };
}
