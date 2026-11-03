import { describe, expect, it } from 'vitest';
import { paletteShortcut, type ShortcutContext, type ShortcutKey } from '../../src/lib/paletteShortcut';

const key = (k: string, mods: Partial<ShortcutKey> = {}): ShortcutKey => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, ...mods });
const idle: ShortcutContext = { isOpen: false, typing: false, otherModalOpen: false };

describe('paletteShortcut', () => {
  it('Ctrl/⌘+K：空闲时打开，已打开时关闭', () => {
    expect(paletteShortcut(key('k', { ctrlKey: true }), idle)).toEqual({ action: 'open', preventDefault: true });
    expect(paletteShortcut(key('K', { metaKey: true }), idle)).toEqual({ action: 'open', preventDefault: true });
    expect(paletteShortcut(key('k', { ctrlKey: true }), { ...idle, isOpen: true })).toEqual({ action: 'close', preventDefault: true });
  });
  it('其他模态弹层已打开：不动作，也不吞浏览器自己的快捷键', () => {
    const blocked = { ...idle, otherModalOpen: true };
    expect(paletteShortcut(key('k', { ctrlKey: true }), blocked)).toEqual({ action: 'none', preventDefault: false });
    expect(paletteShortcut(key('/'), blocked)).toEqual({ action: 'none', preventDefault: false });
  });
  it('"/"：空闲时打开；输入框里、带修饰键、面板已开时不触发', () => {
    expect(paletteShortcut(key('/'), idle)).toEqual({ action: 'open', preventDefault: true });
    expect(paletteShortcut(key('/'), { ...idle, typing: true }).action).toBe('none');
    expect(paletteShortcut(key('/', { altKey: true }), idle).action).toBe('none');
    expect(paletteShortcut(key('/'), { ...idle, isOpen: true }).action).toBe('none');
  });
  it('其他按键不处理', () => {
    expect(paletteShortcut(key('a'), idle).action).toBe('none');
  });
});
