import { subscribeContentChanges } from './changes';

/**
 * 请求层的内存缓存：
 *  - 同一个 key 并发请求只发一次（首页语料和列表页同时要 /essays 时合并）；
 *  - 成功的结果在 TTL 内直接复用（来回切页、详情页返回不再重新请求）；
 *  - 失败不缓存（重试一定会真正重新请求）；「不存在」(undefined) 也不缓存；
 *  - invalidateContent() 会清空全部，保持和语料缓存一致。
 * 缓存的是同一份数组 / 对象，调用方不要原地修改（现有页面都是先 filter 复制再排序）。
 */
export const CACHE_TTL_MS = 60_000;

interface Slot {
  value?: unknown;
  at: number;
  pending?: Promise<unknown>;
}

const slots = new Map<string, Slot>();
let clock: () => number = Date.now;

/** 仅测试用：替换时钟 */
export function __setClock(fn: () => number): void {
  clock = fn;
}

const fresh = (s: Slot | undefined, ttl: number): s is Slot & { value: unknown } =>
  !!s && s.value !== undefined && clock() - s.at < ttl;

export function cached<T>(key: string, load: () => Promise<T>, ttl = CACHE_TTL_MS): Promise<T> {
  const hit = slots.get(key);
  if (fresh(hit, ttl)) return Promise.resolve(hit.value as T);
  if (hit?.pending) return hit.pending as Promise<T>;

  const slot: Slot = { at: 0 };
  const p = load().then(
    (value) => {
      // 请求期间被 clearCache 清掉的话，这份结果已经过期，不写回
      if (slots.get(key) === slot) {
        if (value === undefined) slots.delete(key);
        else {
          slot.value = value;
          slot.at = clock();
          slot.pending = undefined;
        }
      }
      return value;
    },
    (err: unknown) => {
      if (slots.get(key) === slot) slots.delete(key);
      throw err;
    },
  );
  slot.pending = p;
  slots.set(key, slot);
  return p;
}

/** 同步读取未过期的缓存值；没有就返回 undefined（用来避免挂载时闪一帧骨架） */
export function peekCache<T>(key: string, ttl = CACHE_TTL_MS): T | undefined {
  const s = slots.get(key);
  return fresh(s, ttl) ? (s.value as T) : undefined;
}

export function clearCache(): void {
  slots.clear();
}

subscribeContentChanges(clearCache);
