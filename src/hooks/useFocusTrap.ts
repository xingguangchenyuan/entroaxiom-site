import { useEffect } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 焦点陷阱（设计文档 §11.3 放大层 / §13.2 移动菜单）
 * - active 时：Tab/Shift+Tab 在容器内循环，不放跑到背景页面；
 * - 打开时焦点移入容器内第一个可聚焦元素；
 * - 关闭后把焦点还给之前聚焦的元素（opener）。
 */
export function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const first = (container.querySelector(FOCUSABLE) as HTMLElement | null) ?? container;
    (first instanceof HTMLElement ? first : container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
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
      previouslyFocused?.focus();
    };
  }, [active, containerRef]);
}