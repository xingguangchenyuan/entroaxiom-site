import { useEffect, useState } from 'react';
import { copy } from '../../config/site';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { IconMenu, IconClose } from '../ui/Icons';
import type { Heading } from './Markdown';

interface Props {
  headings: Heading[];
}

/**
 * 阅读目录
 *  - 标题数 ≥ 3 才显示，不足则不渲染；
 *  - 桌面：正文右侧 sticky，随滚动高亮当前章节（IntersectionObserver）；
 *  - 移动端：悬浮的“目录”按钮，点开后选章节并收起；
 *  - 点击使用平滑滚动并更新地址栏 hash（减少动态效果时直接跳转）。
 */
export function Toc({ headings }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (headings.length < 3 || typeof IntersectionObserver === 'undefined') return;
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e);
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = headings.find((h) => visible.has(h.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-90px 0px -65% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', `#${id}`);
    setActive(id);
    setOpen(false);
  };

  const list = (
    <ul className="toc__list">
      {headings.map((h) => (
        <li key={h.id} className={h.level === 3 ? 'toc__sub' : undefined}>
          <a href={`#${h.id}`} onClick={(e) => go(e, h.id)} aria-current={active === h.id ? 'true' : undefined}>
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <nav className="toc toc--desktop" aria-label={copy.toc.label}>
        <p className="toc__title">{copy.toc.label}</p>
        {list}
      </nav>
      <div className="toc toc--mobile">
        <button type="button" className="toc__fab glass glass--pill" aria-expanded={open} aria-controls="toc-sheet" onClick={() => setOpen((v) => !v)}>
          {open ? <IconClose size={16} /> : <IconMenu size={16} />}
          <span>{copy.toc.label}</span>
        </button>
        {open && (
          <nav id="toc-sheet" className="toc__sheet glass" aria-label={copy.toc.label}>
            {list}
          </nav>
        )}
      </div>
    </>
  );
}
