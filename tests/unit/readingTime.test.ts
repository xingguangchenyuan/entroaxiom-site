import { describe, expect, it } from 'vitest';
import { readingMinutes } from '../../src/lib/readingTime';

describe('readingMinutes', () => {
  it('最少 1 分钟', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('短')).toBe(1);
  });
  it('中文约 400 字/分', () => {
    expect(readingMinutes('字'.repeat(800))).toBe(2);
    expect(readingMinutes('字'.repeat(2000))).toBe(5);
  });
  it('英文约 220 词/分', () => {
    expect(readingMinutes('word '.repeat(440))).toBe(2);
  });
});
