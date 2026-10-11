import type { ReactNode } from 'react';

interface Props {
  /** 默认必填；home 留白面板可不传 */
  children?: ReactNode;
  /** home：无面板，壁纸留白；panel：内容面板（模块/详细页） */
  variant?: 'home' | 'panel';
}

/**
 * 主内容容器（设计文档 §7）
 * - 始终渲染 <main id="main" tabindex="-1">，供「跳到主要内容」定位与焦点移交；
 * - home 不套面板（壁纸留白即完整设计）；其余页面套 --c-surface 圆角面板，
 *   内容区 200ms 淡入。
 */
export function ContentPanel({ children, variant = 'panel' }: Props) {
  if (variant === 'home') {
    return (
      <main id="main" tabIndex={-1} className="content content-home">
        {children}
      </main>
    );
  }
  return (
    <main id="main" tabIndex={-1} className="content">
      <div className="content-panel">{children}</div>
    </main>
  );
}