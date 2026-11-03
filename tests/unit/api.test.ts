/**
 * 公开接口客户端的行为：字段兼容、私密引用兜底、404 语义。
 *
 * 这组用例针对的是两个真实踩过的坑：
 *  1. 后台先叫 `src`，后来叫 `publicSrc`/`publicUrl`，前台只认一种 → 图片静默消失；
 *  2. 列表接口 404 被当成"空列表"，反向代理配错时页面显示"暂无内容"，谁也没发现。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiRequestError,
  getEssay,
  listEssays,
  resolvePublicUrl,
  toFile,
  toShelf,
  type WireFile,
  type WireShelf,
} from '../../src/content/api';

const wireFile = (over: Partial<WireFile> = {}): WireFile => ({
  id: 'f_1',
  name: '草图.png',
  ext: 'png',
  kind: 'image',
  size: 1024,
  updatedAt: '2026-10-01T00:00:00Z',
  src: null,
  description: null,
  ...over,
});

const wireShelf = (over: Partial<WireShelf> = {}): WireShelf => ({
  id: 's_1',
  kind: 'book',
  title: '夜航西飞',
  creator: 'Beryl Markham',
  year: 1942,
  rating: 4.5,
  status: 'done',
  date: null,
  tags: null,
  quote: null,
  review: null,
  cover: null,
  link: null,
  ...over,
});

describe('resolvePublicUrl', () => {
  it('把 asset: 引用当成"没有图"', () => {
    expect(resolvePublicUrl('asset:f_1')).toBeUndefined();
    expect(resolvePublicUrl('asset:')).toBeUndefined();
  });

  it('放过正常的公开地址', () => {
    expect(resolvePublicUrl(' /uploads/public/f_1.svg ')).toBe('/uploads/public/f_1.svg');
    expect(resolvePublicUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('空值统一变成 undefined', () => {
    expect(resolvePublicUrl(null)).toBeUndefined();
    expect(resolvePublicUrl(undefined)).toBeUndefined();
    expect(resolvePublicUrl('   ')).toBeUndefined();
  });
});

describe('toFile：三种字段名都要能认', () => {
  it('优先用 publicUrl', () => {
    const file = toFile(
      wireFile({
        publicUrl: '/uploads/public/a.pdf',
        publicSrc: '/uploads/public/b.pdf',
        src: '/uploads/public/c.pdf',
      }),
    );
    expect(file.src).toBe('/uploads/public/a.pdf');
  });

  it('退回 publicSrc', () => {
    const file = toFile(
      wireFile({ publicSrc: '/uploads/public/b.pdf', src: '/uploads/public/c.pdf' }),
    );
    expect(file.src).toBe('/uploads/public/b.pdf');
  });

  it('再退回老字段 src', () => {
    const file = toFile(wireFile({ src: '/uploads/public/c.pdf' }));
    expect(file.src).toBe('/uploads/public/c.pdf');
  });

  it('私密文件（全是 null）不带地址', () => {
    expect(toFile(wireFile()).src).toBeUndefined();
  });

  it('漏转换的 asset: 引用不会变成请求地址', () => {
    expect(toFile(wireFile({ src: 'asset:f_1' })).src).toBeUndefined();
  });
});

describe('toShelf：封面只认公开地址', () => {
  it('优先用 coverUrl', () => {
    expect(
      toShelf(wireShelf({ coverUrl: '/uploads/public/cover.svg', cover: 'asset:f_9' }))
        .cover,
    ).toBe('/uploads/public/cover.svg');
  });

  it('没有 coverUrl 时用 cover', () => {
    expect(toShelf(wireShelf({ cover: '/uploads/public/cover.svg' })).cover).toBe(
      '/uploads/public/cover.svg',
    );
  });

  it('封面还是私密引用时不渲染图片', () => {
    expect(toShelf(wireShelf({ cover: 'asset:f_9', coverVisibility: undefined } as never)).cover).toBeUndefined();
  });
});

describe('404 语义：详情放过，列表报错', () => {
  beforeEach(() => {
    // 请求里用了 window.setTimeout / clearTimeout 做超时，node 环境补一个最小实现
    vi.stubGlobal('window', {
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('详情 404 返回 undefined（页面显示未找到）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 })),
    );
    await expect(getEssay('nope')).resolves.toBeUndefined();
  });

  it('列表 404 抛 ENDPOINT_NOT_FOUND，而不是空列表', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 })),
    );
    await expect(listEssays()).rejects.toBeInstanceOf(ApiRequestError);
    await expect(listEssays()).rejects.toMatchObject({
      status: 404,
      code: 'ENDPOINT_NOT_FOUND',
    });
  });

  it('列表 500 仍然抛错，不当成空数据', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: false, data: null, error: { code: 'BOOM', message: '炸了' } }), {
            status: 500,
          }),
      ),
    );
    await expect(listEssays()).rejects.toMatchObject({ status: 500, code: 'BOOM' });
  });
});
