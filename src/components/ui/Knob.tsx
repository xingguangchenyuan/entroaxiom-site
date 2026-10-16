import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface KnobProps {
  children: ReactNode;
  /** gold：主要操作；dark：次要；danger：危险操作 */
  tone?: 'gold' | 'dark' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  busy?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** 提供 to 时渲染为站内链接 */
  to?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  className?: string;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  title?: string;
}

/**
 * 拟物旋钮按钮：底座 + 金属帽。按下时帽子沉入底座；busy 时指示灯呼吸。
 * 视觉细节都在 glass.css（.knob*），这里只负责语义与状态。
 */
export function Knob({ children, tone = 'gold', size = 'md', block, busy, disabled, type = 'button', to, onClick, className = '', ...aria }: KnobProps) {
  const cls = ['knob', tone === 'dark' && 'knob--dark', tone === 'danger' && 'knob--danger', size === 'sm' && 'knob--sm', size === 'lg' && 'knob--lg', block && 'knob--block', busy && 'is-busy', className]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <span className="knob__cap">
      {busy && <span className="knob__led" aria-hidden="true" />}
      {children}
    </span>
  );
  if (to && !disabled) {
    return (
      <Link to={to} className={cls} onClick={onClick} {...aria}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || busy} aria-busy={busy || undefined} onClick={onClick} {...aria}>
      {inner}
    </button>
  );
}
