/**
 * 命令面板快捷键的决策：纯函数，不碰 DOM，方便单测。
 *
 *  - Ctrl/⌘ + K：面板已打开 → 关闭；否则打开。
 *  - `/`：不在输入框里、没有修饰键时打开。
 *  - 其他模态弹层（图片灯箱、书影音抽屉、欢迎层）已打开时一律不动作，并且不阻止浏览器默认行为
 *    （否则会白白吞掉浏览器自己的 Ctrl+K，例如 Firefox 的聚焦搜索栏）。
 */

/** 命令面板之外的模态弹层：灯箱和抽屉自己写了 role="dialog"，欢迎层的 role 由 Radix 在运行时加上 */
export const OTHER_MODAL_SELECTOR = '[role="dialog"]:not(.palette__box)';

export interface ShortcutKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export interface ShortcutContext {
  isOpen: boolean;
  typing: boolean;
  otherModalOpen: boolean;
}

export interface ShortcutDecision {
  action: 'open' | 'close' | 'none';
  preventDefault: boolean;
}

const NONE: ShortcutDecision = { action: 'none', preventDefault: false };

export function paletteShortcut(e: ShortcutKey, ctx: ShortcutContext): ShortcutDecision {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    if (ctx.isOpen) return { action: 'close', preventDefault: true };
    if (ctx.otherModalOpen) return NONE;
    return { action: 'open', preventDefault: true };
  }
  if (e.key === '/' && !ctx.typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (ctx.isOpen || ctx.otherModalOpen) return NONE;
    return { action: 'open', preventDefault: true };
  }
  return NONE;
}
