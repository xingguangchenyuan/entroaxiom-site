import { useEffect, useRef, type CSSProperties } from 'react';
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

/** 移动端导航：全屏的“星座表”，每一项带拉丁铭文；焦点陷阱 + Esc / 点击外部关闭 */
export function MobileMenu({ open, onClose, onSearch, onDrift }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  // 点菜单外面就会关，不是严格的模态：只做焦点循环，不把背景设为 inert（否则顶栏的菜单按钮点不到）
  useFocusTrap(open, ref, { modal: false, onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Element;
      if (ref.current && !ref.current.contains(t) && !t.closest?.('.menu-toggle')) onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div id="mobile-menu" className="mobile-menu glass lit" ref={ref}>
      <ul className="mobile-menu__list" role="list">
        {navItems.map((item, i) => {
          const active = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <li key={item.to} style={{ ['--i' as string]: i, ['--c' as string]: item.color ?? 'var(--sol)' } as CSSProperties}>
              <Link to={item.to} onClick={onClose} className="mobile-menu__link" aria-current={active ? 'page' : undefined}>
                <span className="nav__star" aria-hidden="true" />
                <span className="mobile-menu__label">{item.label}</span>
                <span className="mobile-menu__latin latin">{item.latin}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mobile-menu__tools">
        <button type="button" className="chip" onClick={() => { onClose(); onSearch(); }}>
          <IconSearch size={15} /> 检索
        </button>
        <button type="button" className="chip" onClick={() => { onClose(); onDrift(); }}>
          <IconDrift size={15} /> 漂流
        </button>
      </div>
    </div>
  );
}
