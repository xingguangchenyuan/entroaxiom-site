import { beforeEach, describe, expect, it } from 'vitest';
import { __setClock, cached, clearCache, peekCache } from '../../src/content/cache';
import { invalidateContent } from '../../src/content/changes';

let now = 0;

beforeEach(() => {
  clearCache();
  now = 1_000;
  __setClock(() => now);
});

describe('cached', () => {
  it('同一个 key 并发请求只发一次', async () => {
    let calls = 0;
    const load = async () => ++calls;
    const [a, b] = await Promise.all([cached('k', load), cached('k', load)]);
    expect(calls).toBe(1);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('TTL 内复用，过期后重新请求', async () => {
    let calls = 0;
    const load = async () => ++calls;
    await cached('k', load, 500);
    now += 499;
    expect(await cached('k', load, 500)).toBe(1);
    now += 2;
    expect(await cached('k', load, 500)).toBe(2);
  });

  it('失败不缓存，下一次会真正重试', async () => {
    let calls = 0;
    await expect(
      cached('f', async () => {
        calls++;
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await cached('f', async () => ++calls)).toBe(2);
  });

  it('undefined（内容不存在）不缓存', async () => {
    let calls = 0;
    const load = async () => {
      calls++;
      return undefined;
    };
    await cached('m', load);
    await cached('m', load);
    expect(calls).toBe(2);
  });

  it('请求进行中被清空时，旧结果不会写回', async () => {
    let release!: (v: string) => void;
    const slow = cached('s', () => new Promise<string>((r) => (release = r)));
    clearCache();
    release('stale');
    expect(await slow).toBe('stale');
    expect(peekCache('s')).toBeUndefined();
  });

  it('invalidateContent 会清空全部缓存', async () => {
    await cached('a', async () => 'x');
    expect(peekCache('a')).toBe('x');
    invalidateContent();
    expect(peekCache('a')).toBeUndefined();
  });
});

describe('peekCache', () => {
  it('只返回未过期的值', async () => {
    await cached('p', async () => 'v', 100);
    expect(peekCache('p', 100)).toBe('v');
    now += 100;
    expect(peekCache('p', 100)).toBeUndefined();
  });
});
