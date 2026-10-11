import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from '../../config/site';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * 移动端导航面板（设计文档 §6.4）
 * - 菜单按钮 aria-expanded / aria-controls 指向本面板；
 * - 打开时焦点进入面板（焦点陷阱），关闭后由 useFocusTrap 把焦点还给按钮；
 * - 点击导航项后收起。
 */
export function MobileMenu({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(open, ref);

  // Esc 关闭；点击面板外（菜单按钮除外）关闭（设计文档 §13.2）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !(target as Element).closest?.('.menu-toggle')) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const classFor = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'mobile-link mobile-link-active' : 'mobile-link';

  return (
    <div id="mobile-menu" className="mobile-menu" ref={ref}>
      <ul className="mobile-menu-list">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={classFor}
              role="menuitem"
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}