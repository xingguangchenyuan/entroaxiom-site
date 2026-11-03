import { useEffect } from 'react';

/**
 * 统一管理弹层的 body 滚动锁。
 * 多个弹层同时存在时只在第一个锁定者进入时修改页面样式，最后一个退出时恢复，
 * 避免关闭上层弹层就意外解锁下层弹层，并保留调用前已有的 inline padding。
 */
let activeLocks = 0;
let originalPaddingRight = '';
let originallyHadScrollLock = false;

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;

    if (activeLocks === 0) {
      originallyHadScrollLock = html.classList.contains('scroll-lock');
      originalPaddingRight = body.style.paddingRight;

      // 若外部代码已经锁定页面，则不重复叠加补偿；否则先测量再隐藏滚动条。
      if (!originallyHadScrollLock) {
        const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
        const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
        html.classList.add('scroll-lock');
        if (scrollbarWidth > 0) {
          body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
        }
      }
    }

    activeLocks += 1;
    let released = false;

    return () => {
      if (released) return;
      released = true;
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks === 0) {
        if (!originallyHadScrollLock) {
          html.classList.remove('scroll-lock');
          body.style.paddingRight = originalPaddingRight;
        }
        originalPaddingRight = '';
        originallyHadScrollLock = false;
      }
    };
  }, [locked]);
}
