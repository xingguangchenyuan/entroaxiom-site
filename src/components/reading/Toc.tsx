import { useState } from 'react';
import { copy } from '../../config/site';
import type { Heading } from './Markdown';

interface Props {
  headings: Heading[];
}

/**
 * 阅读目录（设计文档 §11.2）
 * - 标题数 ≥ 3 才显示，不足则不渲染，正文占满行宽；
 * - 桌面（≥1024px）：正文右侧 sticky，200~240px，自身可滚动；
 *   容器不够宽时由 CSS 隐藏（正文宽度不被压缩）；
 * - 移动端：收进「目录」展开按钮，点击项后定位并收起。
 */
export function Toc({ headings }: Props) {
  const [open, setOpen] = useState(false);

  if (headings.length < 3) return null;

  return (
    <>
      {/* 桌面侧边目录 */}
      <nav className="doc-toc-desktop" aria-label={copy.toc.label}>
        <p className="doc-toc-title">{copy.toc.label}</p>
        <ul className="doc-toc-list">
          {headings.map((h) => (
            <li key={h.id} className={h.level === 3 ? 'doc-toc-sub' : undefined}>
              <a href={`#${h.id}`}>{h.text}</a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 移动端折叠目录 */}
      <nav className="doc-toc-mobile" aria-label={copy.toc.label}>
        <button
          type="button"
          className="doc-toc-toggle"
          aria-expanded={open}
          aria-controls="doc-toc-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {copy.toc.label}
          <span className="doc-toc-caret" aria-hidden="true">
            {open ? '▴' : '▾'}
          </span>
        </button>
        {open && (
          <ul id="doc-toc-panel" className="doc-toc-panel">
            {headings.map((h) => (
              <li key={h.id} className={h.level === 3 ? 'doc-toc-sub' : undefined}>
                <a href={`#${h.id}`} onClick={() => setOpen(false)}>
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </>
  );
}