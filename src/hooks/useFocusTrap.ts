import { useEffect, useRef } from 'react';
import { inertBackground } from '../lib/inertBackground';
import { isImeComposing } from '../lib/ime';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 焦点陷阱（图片放大层、命令面板、书影音抽屉、移动菜单共用）
 * - active 时：Tab/Shift+Tab 在容器内循环，不放跑到背景页面；
 * - 打开时焦点移入容器内第一个可聚焦元素；
 * - 默认同时把弹层以外的页面设为 inert（背景不可聚焦、读屏忽略）；
 *   非模态的浮层（如移动端菜单，点外面就关）传 { modal: false } 跳过；
 * - 传 onEscape 时，按 Esc 调用它（输入法组合中的 Esc 不算）；
 * - 关闭后把焦点还给之前聚焦的元素（opener）。
 */
export function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  { modal = true, onEscape }: { modal?: boolean; onEscape?: () => void } = {},
): void {
  // 回调放进 ref：父组件每次渲染传新函数也不会让下面的 effect 重跑（重跑会重新抢焦点）
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const first = (container.querySelector(FOCUSABLE) as HTMLElement | null) ?? container;
    (first instanceof HTMLElement ? first : container).focus();
    const restoreBackground = modal ? inertBackground(container) : null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escapeRef.current && !isImeComposing(e)) {
        escapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl || !container.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (document.activeElement === lastEl || !container.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreBackground?.(); // 先恢复背景再还焦点：inert 的元素聚焦不上
      previouslyFocused?.focus();
    };
  }, [active, containerRef, modal]);
}