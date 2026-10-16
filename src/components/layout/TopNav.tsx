import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems, SITE_NAME, copy } from '../../config/site';
import { useDrift } from '../../hooks/useDrift';
import { AxiomMark } from './AxiomMark';
import { MobileMenu } from './MobileMenu';
import { usePalette } from './CommandPalette';
import { IconDrift, IconMenu, IconClose, IconSearch } from '../ui/Icons';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function isActive(pathname: string, to: string, end?: boolean): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * 顶栏：悬浮的玻璃胶囊。
 *  - 当前页的“光斑”在链接之间滑动（位置由实际元素测量，窗口变化时重算）
 *  - 滚动后收紧；搜索（⌘K）与漂流是常驻的两个工具
 */
export function TopNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState<{ x: number; w: number } | null>(null);
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
      setGlow({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    // 字体加载完成后宽度会变
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    void fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname]);

  return (
    <header className={`nav${condensed ? ' is-condensed' : ''}`}>
      <div className="nav__bar glass glass--pill lit">
        <Link to="/" className="nav__brand" aria-label={`${SITE_NAME} 首页`}>
          <AxiomMark className="nav__mark" />
          <span className="nav__name display">{SITE_NAME}</span>
        </Link>

        <nav className="nav__links" aria-label="主导航" ref={linksRef}>
          {glow && <span className="nav__glow" style={{ transform: `translateX(${glow.x}px)`, width: glow.w }} aria-hidden="true" />}
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="nav__link" aria-current={isActive(pathname, item.to, item.end) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav__tools">
          <button type="button" className="nav__tool nav__search" onClick={palette.open} aria-label="搜索全站（快捷键 Ctrl K）">
            <IconSearch size={17} />
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
