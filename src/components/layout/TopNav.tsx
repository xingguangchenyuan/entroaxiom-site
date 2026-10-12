import { NavLink } from 'react-router-dom';
import { SITE_NAME, copy, navItems } from '../../config/site';
import { AxiomMark } from './AxiomMark';

interface Props {
  onNavigate: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

function classFor({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav-link nav-link-active' : 'nav-link';
}

/**
 * 顶部导航（设计文档 §6.4）
 * - position: fixed，滚动时保持可见；
 * - 当前项：accent 色 + 文字等宽 2px 短下划线 + aria-current（NavLink 自带）；
 * - 移动端折叠为菜单按钮，导航项收进 MobileMenu。
 */
export function TopNav({ onNavigate, menuOpen, onToggleMenu }: Props) {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <NavLink to="/" className="brand" onClick={onNavigate}>
          <AxiomMark className="brand-mark" />
          {SITE_NAME}
        </NavLink>

        <nav className="topnav-desktop" aria-label={SITE_NAME}>
          <ul className="topnav-list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} onClick={onNavigate} className={classFor}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? copy.menu.close : copy.menu.open}
          onClick={onToggleMenu}
        >
          <span className="menu-toggle-line" />
          <span className="menu-toggle-line" />
          <span className="menu-toggle-line" />
        </button>
      </div>
    </header>
  );
}