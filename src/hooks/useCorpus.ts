import { useEffect, useState, useSyncExternalStore } from 'react';
import { loadCorpus, type Corpus } from '../content/corpus';
import { getContentVersion, invalidateContent, subscribeContentChanges } from '../content/changes';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; corpus: Corpus };

/** 读取全站语料（带缓存）；error 状态可调用 retry 重新请求 */
export function useCorpus(): State & { retry: () => void } {
  const [state, setState] = useState<State>({ status: 'loading' });
  const version = useSyncExternalStore(subscribeContentChanges, getContentVersion);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    loadCorpus()
      .then((corpus) => alive && setState({ status: 'ready', corpus }))
      .catch((err: unknown) => alive && setState({ status: 'error', message: err instanceof Error ? err.message : '加载失败' }));
    return () => {
      alive = false;
    };
  }, [version]);

  return { ...state, retry: invalidateContent };
}
