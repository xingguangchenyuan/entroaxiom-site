import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { GalaxyBackdrop } from './GalaxyBackdrop';
import { CosmicScene, type CosmicSceneName } from '../art/CosmicScene';
import { worlds, type WorldKey } from '../../config/worlds';

interface Props {
  /** 默认必填；home 留白面板可不传 */
  children?: ReactNode;
  /** home：无面板，壁纸留白；panel：内容面板（模块/详细页） */
  variant?: 'home' | 'panel';
  /** 列表模块的星球场景；详情页仍保留便于阅读的浅色面板 */
  world?: WorldKey;
}

/**
 * 主内容容器（设计文档 §7）
 * - 始终渲染 <main id="main" tabindex="-1">，供「跳到主要内容」定位与焦点移交；
 * - home 不套面板（壁纸留白即完整设计）；其余页面套 --c-surface 圆角面板，
 *   内容区 200ms 淡入。
 */
export function ContentPanel({ children, variant = 'panel', world }: Props) {
  const { pathname } = useLocation();
  if (variant === 'home') {
    return (
      <main id="main" tabIndex={-1} className="content content-home">
        {children}
      </main>
    );
  }
  if (world) {
    return (
      <main id="main" tabIndex={-1} className={`content world-page world-page-${world}`}>
        <GalaxyBackdrop featured={world} />
        <div className="world-page-art" aria-hidden="true">
          <CosmicScene scene={({ earth: 'horizon', venus: 'corona', mars: 'lens' } satisfies Record<WorldKey, CosmicSceneName>)[world]} />
        </div>
        <div className="world-page-content">
          <span className="world-page-kicker">ENTROAXIOM / {worlds[world].tag}</span>
          <span className="world-page-english" aria-hidden="true">{worlds[world].name}</span>
          <p className="world-page-description">{worlds[world].description}</p>
          <div className="world-page-readout" aria-hidden="true">
            <span>◈ / {worlds[world].module}</span>
            <span>OBSERVATION IN PROGRESS</span>
          </div>
          <div className="content-panel">{children}</div>
        </div>
      </main>
    );
  }
  // 详情页 / 404：沿用星空背景，面板为深色阅读面板（样式见 galaxy.css .world-page-reading）。
  // 背景星座随所属模块变化：笔记 venus、总结 mars，其余（文件库等）earth。
  const readingWorld: WorldKey = pathname.startsWith('/notes')
    ? 'venus'
    : pathname.startsWith('/summaries')
      ? 'mars'
      : 'earth';
  return (
    <main id="main" tabIndex={-1} className="content world-page world-page-reading">
      <GalaxyBackdrop featured={readingWorld} />
      <div className="world-page-content">
        <div className="content-panel">{children}</div>
      </div>
    </main>
  );
}