import { useEffect } from 'react';

/**
 * 锁定 body 滚动（设计文档 §11.3 放大层）
 * - 锁定期间给 html 加 .scroll-lock（overflow:hidden）；
 * - 同时把滚动条宽度补到 body 的 padding-right，避免页面横向跳动。
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const html = document.documentElement;
    const body = document.body;
    html.classList.add('scroll-lock');
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      html.classList.remove('scroll-lock');
      body.style.paddingRight = '';
    };
  }, [locked]);
}