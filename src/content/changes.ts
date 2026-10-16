/** 管理端写入成功后，让所有公开内容消费者同步丢弃旧索引。 */
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
