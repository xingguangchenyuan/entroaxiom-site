import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems } from '../../config/site';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconDrift, IconSearch } from '../ui/Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  onDrift: () => void;
}

/** 移动端导航：从顶栏下方展开的玻璃面板；焦点陷阱 + Esc / 点击外部关闭 */
export function MobileMenu({ open, onClose, onSearch, onDrift }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useFocusTrap(open, ref);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Element;
      if (ref.current && !ref.current.contains(t) && !t.closest?.('.menu-toggle')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div id="mobile-menu" className="mobile-menu glass lit" ref={ref}>
      <ul className="mobile-menu__list">
        {navItems.map((item, i) => {
          const active = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <li key={item.to} style={{ ['--i' as string]: i }}>
              <Link to={item.to} onClick={onClose} className="mobile-menu__link" aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mobile-menu__tools">
        <button type="button" className="chip" onClick={() => { onClose(); onSearch(); }}>
          <IconSearch size={15} /> 搜索
        </button>
        <button type="button" className="chip" onClick={() => { onClose(); onDrift(); }}>
          <IconDrift size={15} /> 漂流
        </button>
      </div>
    </div>
  );
}
