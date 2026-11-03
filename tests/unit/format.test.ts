import { describe, expect, it } from 'vitest';
import { dateKey, formatBytes, formatDate, formatDateTime, kindLabel } from '../../src/lib/format';

describe('formatBytes', () => {
  it('按量级换算并去掉多余的 .0', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });
  it('非法输入返回空串', () => {
    expect(formatBytes(-1)).toBe('');
    expect(formatBytes(Number.NaN)).toBe('');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('本地时间格式 YYYY.MM.DD HH:mm', () => {
    expect(formatDateTime('2026-10-28T12:34:00')).toBe('2026.10.28 12:34');
  });
  it('解析失败时原样返回', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});

describe('日期取值', () => {
  it('updated 优先，回落到 date，都没有则为空串', () => {
    expect(formatDate('2026-02-01', '2026-01-01')).toBe('2026-02-01');
    expect(formatDate(undefined, '2026-01-01')).toBe('2026-01-01');
    expect(dateKey(undefined, undefined)).toBe('');
  });
});

describe('kindLabel', () => {
  it('已知类型有中文标签，未知回落到“其他”', () => {
    expect(kindLabel('pdf')).toBe('PDF');
    expect(kindLabel('image')).toBe('图片');
    expect(kindLabel('???')).toBe('其他');
  });
});
