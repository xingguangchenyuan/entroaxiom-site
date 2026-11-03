/** 内容失效通知：「重试」按钮会调用 invalidateContent()，让请求缓存和全站语料一并丢弃、重新加载。 */
let version = 0;
const listeners = new Set<() => void>();

export const getContentVersion = (): number => version;
export function subscribeContentChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function invalidateContent(): void {
  version++;
  listeners.forEach((listener) => listener());
}
