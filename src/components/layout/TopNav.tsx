import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems, SITE_NAME, copy } from '../../config/site';
import { useDrift } from '../../hooks/useDrift';
import { AxiomMark } from './AxiomMark';
import { MobileMenu } from './MobileMenu';
import { usePalette } from './CommandPalette';
import { IconDrift, IconMenu, IconClose, IconSearch } from '../ui/Icons';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function isActive(pathname: string, to: string, end?: boolean): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * 顶栏：一条细长的“观测台”。
 *  - 每个模块链接前有一颗对应天体色的小星，当前页的星会发光，
 *    下方一道彩色的“轨迹”在链接之间滑动（位置由实际元素测量）。
 *  - 滚动后收紧为悬浮胶囊；搜索（⌘K）与漂流常驻右侧。
 */
export function TopNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState<{ x: number; w: number; c: string } | null>(null);
  const palette = usePalette();
  const drift = useDrift();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const root = linksRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>('[aria-current="page"]');
      if (!el) {
        setGlow(null);
        return;
      }
      setGlow({ x: el.offsetLeft, w: el.offsetWidth, c: el.dataset.color || 'var(--sol)' });
    };
    measure();
    window.addEventListener('resize', measure);
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    void fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname, condensed]);

  return (
    <header className={`nav${condensed ? ' is-condensed' : ''}`}>
      <div className="nav__bar lit">
        <Link to="/" className="nav__brand" aria-label={`${SITE_NAME} 首页`}>
          <AxiomMark className="nav__mark" />
          <span className="nav__name">
            <span className="nav__word">{SITE_NAME}</span>
            <span className="nav__sub">熵 · 公理</span>
          </span>
        </Link>

        <nav className="nav__links" aria-label="主导航" ref={linksRef}>
          {glow && (
            <span
              className="nav__glow"
              style={{ transform: `translateX(${glow.x}px)`, width: glow.w, ['--c' as string]: glow.c } as CSSProperties}
              aria-hidden="true"
            />
          )}
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nav__link"
              data-color={item.color}
              style={{ ['--c' as string]: item.color ?? 'var(--sol)' } as CSSProperties}
              aria-current={isActive(pathname, item.to, item.end) ? 'page' : undefined}
            >
              <span className="nav__star" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav__tools">
          <button type="button" className="nav__tool nav__search" onClick={palette.open} aria-label="搜索全站（快捷键 Ctrl K）">
            <IconSearch size={16} />
            <span className="nav__search-label">检索星空</span>
            <kbd className="nav__kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <button type="button" className="nav__tool" onClick={drift} aria-label="漂流：随机去一篇内容" title="漂流">
            <IconDrift size={18} />
          </button>
          <button
            type="button"
            className="nav__tool nav__menu-toggle menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? copy.menu.close : copy.menu.open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose size={18} /> : <IconMenu size={18} />}
          </button>
        </div>
      </div>
      <MobileMenu open={open} onClose={() => setOpen(false)} onSearch={palette.open} onDrift={drift} />
    </header>
  );
}
