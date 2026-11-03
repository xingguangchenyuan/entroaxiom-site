import { describe, expect, it } from 'vitest';
import { classifyHref, withRetryParam } from '../../src/lib/links';

describe('classifyHref', () => {
  it('站内路由走 internal，保留查询串和 hash', () => {
    expect(classifyHref('/essays/foo?x=1#top')).toEqual({ kind: 'internal', to: '/essays/foo?x=1#top' });
    expect(classifyHref('/')).toEqual({ kind: 'internal', to: '/' });
  });
  it('同源但不是前端路由的路径（静态文件）交给浏览器', () => {
    expect(classifyHref('/uploads/a.pdf')).toEqual({ kind: 'other' });
  });
  it('指向本站的绝对地址按站内链接处理', () => {
    expect(classifyHref('https://example.com/notes/a#b', 'https://example.com')).toEqual({ kind: 'internal', to: '/notes/a#b' });
    expect(classifyHref('https://other.com/notes/a', 'https://example.com')).toEqual({ kind: 'external' });
  });
  it('协议相对地址是外链；锚点、mailto、空值不接管', () => {
    expect(classifyHref('//cdn.example.com/x')).toEqual({ kind: 'external' });
    expect(classifyHref('#sec')).toEqual({ kind: 'other' });
    expect(classifyHref('mailto:a@b.c')).toEqual({ kind: 'other' });
    expect(classifyHref(undefined)).toEqual({ kind: 'other' });
    expect(classifyHref('  ')).toEqual({ kind: 'other' });
  });
});

describe('withRetryParam', () => {
  it('nonce 为 0 时不改动', () => {
    expect(withRetryParam('/a.png', 0)).toBe('/a.png');
  });
  it('追加参数，已有查询串用 &，并保留 hash', () => {
    expect(withRetryParam('/a.png', 2)).toBe('/a.png?retry=2');
    expect(withRetryParam('/a.png?v=1', 2)).toBe('/a.png?v=1&retry=2');
    expect(withRetryParam('/a.png#x', 3)).toBe('/a.png?retry=3#x');
  });
});
