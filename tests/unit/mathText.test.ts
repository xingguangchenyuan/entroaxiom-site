import { describe, expect, it } from 'vitest';
import { containsMath } from '../../src/lib/mathText';

describe('containsMath', () => {
  it('普通正文、代码、链接都不算公式', () => {
    expect(containsMath('')).toBe(false);
    expect(containsMath('一段没有公式的正文，含 $ 以外的符号：¥ € % #')).toBe(false);
    expect(containsMath('```\nconst a = 1;\n```')).toBe(false);
  });

  it('金额不是公式（remark-math 也不认）', () => {
    expect(containsMath('价格 $5 到 $9')).toBe(false);
    expect(containsMath('US$5 and $6')).toBe(false);
    expect(containsMath('$ 前面有空格不算 $')).toBe(false);
  });

  it('行内与块级公式能识别', () => {
    expect(containsMath('行内 $a^2+b^2=c^2$ 结束')).toBe(true);
    expect(containsMath('$$\nE = mc^2\n$$')).toBe(true);
    expect(containsMath('单个 $x$')).toBe(true);
  });
});
