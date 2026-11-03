import { describe, expect, it } from 'vitest';
import { applySiteUrl, canonicalUrl, normalizeSiteUrl } from '../../src/lib/siteUrl';

const html = [
  '<meta property="og:title" content="t" />',
  '  <meta property="og:image" content="__SITE_URL__/og-image.png" />',
  '  <meta name="twitter:image" content="__SITE_URL__/og-image.png" />',
  '  <meta name="twitter:card" content="summary_large_image" />',
  '',
].join('\n');

describe('normalizeSiteUrl', () => {
  it('只保留 origin，去掉路径和末尾斜杠', () => {
    expect(normalizeSiteUrl(' https://example.com/abc/ ')).toBe('https://example.com');
    expect(normalizeSiteUrl('http://localhost:5173')).toBe('http://localhost:5173');
  });
  it('空值、缺协议、非 http(s) 都视为未配置', () => {
    expect(normalizeSiteUrl(undefined)).toBeUndefined();
    expect(normalizeSiteUrl('')).toBeUndefined();
    expect(normalizeSiteUrl('example.com')).toBeUndefined();
    expect(normalizeSiteUrl('ftp://example.com')).toBeUndefined();
  });
});

describe('canonicalUrl', () => {
  it('去掉末尾斜杠，根路径保留 /', () => {
    expect(canonicalUrl('https://example.com', '/essays/a/')).toBe('https://example.com/essays/a');
    expect(canonicalUrl('https://example.com', '/')).toBe('https://example.com/');
    expect(canonicalUrl('https://example.com', '')).toBe('https://example.com/');
  });
});

describe('applySiteUrl', () => {
  it('配置了站点地址：占位符全部替换', () => {
    const out = applySiteUrl(html, 'https://example.com');
    expect(out).toMatch(/og:image" content="https:\/\/example\.com\/og-image\.png"/);
    expect(out.includes('__SITE_URL__')).toBe(false);
  });
  it('没配置：只删含占位符的整行，其余保留', () => {
    const out = applySiteUrl(html, undefined);
    expect(out.includes('__SITE_URL__')).toBe(false);
    expect(out.includes('og:image')).toBe(false);
    expect(out.includes('og:title')).toBe(true);
    expect(out.includes('twitter:card')).toBe(true);
  });
});
