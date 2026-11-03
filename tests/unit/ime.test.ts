import { describe, expect, it } from 'vitest';
import { isImeComposing } from '../../src/lib/ime';

describe('isImeComposing', () => {
  it('Chrome / Firefox：isComposing 为 true', () => {
    expect(isImeComposing({ isComposing: true })).toBe(true);
  });
  it('Safari：compositionend 之后 keyCode 仍是 229', () => {
    expect(isImeComposing({ isComposing: false, keyCode: 229 })).toBe(true);
  });
  it('普通按键不算', () => {
    expect(isImeComposing({ isComposing: false, keyCode: 13 })).toBe(false);
    expect(isImeComposing({})).toBe(false);
  });
});
