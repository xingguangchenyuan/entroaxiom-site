import { describe, expect, it } from 'vitest';
import type { GuestForm } from '../../src/lib/guestbook';
import { GUEST_LIMITS, charCount, normalizeSite, validateGuest, validationField } from '../../src/lib/guestbook';

const form = (over: Partial<GuestForm> = {}): GuestForm =>
  ({ name: '访客', email: '', site: '', body: '你好呀', sigil: 'sun', ...over }) as GuestForm;

describe('normalizeSite', () => {
  it('补全协议、去掉末尾斜杠', () => {
    expect(normalizeSite('example.com')).toBe('https://example.com');
    expect(normalizeSite('http://example.com/')).toBe('http://example.com');
  });
  it('空值返回空串，非法返回 null', () => {
    expect(normalizeSite('  ')).toBe('');
    expect(normalizeSite('localhost')).toBeNull();
    expect(normalizeSite('ftp://example.com')).toBeNull();
  });
});

describe('charCount', () => {
  it('emoji 算一个字', () => {
    expect(charCount('a😀b')).toBe(3);
  });
});

describe('validateGuest', () => {
  it('合法表单生成 draft，空的可选字段不带上', () => {
    const { errors, draft } = validateGuest(form());
    expect(errors).toEqual({});
    expect(draft).toEqual({ name: '访客', body: '你好呀', sigil: 'sun' });
  });
  it('称呼空白、留言太短、邮箱和网址不合法都会报错', () => {
    const { errors, draft } = validateGuest(form({ name: ' ', body: '字', email: 'x', site: 'nope' }));
    expect(draft).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['body', 'email', 'name', 'site']);
  });
  it('留言超长报错', () => {
    const { errors } = validateGuest(form({ body: '字'.repeat(GUEST_LIMITS.body + 1) }));
    expect(errors.body).toMatch(/最多/);
  });
});

describe('validationField', () => {
  it('兼容 FastAPI 的 loc 数组与点分字符串', () => {
    expect(validationField([{ loc: ['body', 'name'] }])).toBe('name');
    expect(validationField([{ loc: 'body.email' }])).toBe('email');
  });
  it('无法识别时返回 null', () => {
    expect(validationField([])).toBeNull();
    expect(validationField([{ loc: ['body', 'other'] }])).toBeNull();
    expect(validationField('x')).toBeNull();
  });
});
