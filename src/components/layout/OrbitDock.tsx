import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconMenu } from '../ui/Icons';

/**
 * 移动端的「轨道坞」：屏幕底部一条拇指可达的星轨，五颗天体绕行。
 *  - 当前模块的星会亮起并套上一圈轨道环；
 *  - 最后一格「星表」触发顶栏的完整菜单（用自定义事件解耦，避免把菜单状态提升到 App）；
 *  - 只在窄屏出现（display 由 mobile.css 打开），桌面端完全不参与布局。
 */
const DOCK: { to: string; label: string; color: string; end?: boolean }[] = [
  { to: '/', label: '星仪', color: '#e9bd5e', end: true },
  { to: '/essays', label: '随笔', color: '#ef8456' },
  { to: '/notes', label: '笔记', color: '#9fd6e0' },
  { to: '/shelf', label: '书影音', color: '#ab93ff' },
  { to: '/atlas', label: '星图', color: '#f2a7c3' },
];

/** 与 TopNav 约定的菜单事件名 */
export const OPEN_MENU_EVENT = 'entroaxiom:open-menu';

export function OrbitDock() {
  const { pathname } = useLocation();
  const isActive = (to: string, end?: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

  return (
    <nav className="dock" aria-label="快捷导航">
      <ul className="dock__list" role="list">
        {DOCK.map((item) => {
          const active = isActive(item.to, item.end);
          return (
            <li key={item.to} className="dock__cell">
              <Link
                to={item.to}
                className="dock__item"
                aria-current={active ? 'page' : undefined}
                style={{ ['--c' as string]: item.color } as CSSProperties}
              >
                <span className="dock__bead" aria-hidden="true">
                  <span className="dock__ring" />
                  <span className="dock__dot" />
                </span>
                <span className="dock__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="dock__cell">
          <button
            type="button"
            className="dock__item dock__item--more"
            onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}
            aria-label="展开全部栏目"
          >
            <span className="dock__bead" aria-hidden="true">
              <IconMenu size={14} />
            </span>
            <span className="dock__label">星表</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
