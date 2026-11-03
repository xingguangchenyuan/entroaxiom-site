import type { CSSProperties, ReactNode } from 'react';
import type { World } from '../../config/worlds';

interface Props {
  world: World;
  total?: number;
  unit?: string;
  children?: ReactNode;
}

/**
 * 模块页头：左边是这颗天体（CSS 绘制的行星，带自转的光影与一颗小卫星），
 * 右边是拉丁铭文、模块名、箴言与数量读数。
 */
export function ModuleHeader({ world, total, unit = '篇', children }: Props) {
  return (
    <header className="mod-head" data-hue={world.hue} style={{ ['--c' as string]: world.color } as CSSProperties}>
      <div className={`mod-head__planet${world.ring ? ' has-ring' : ''}`} aria-hidden="true">
        <span className="mod-head__sphere" />
        <span className="mod-head__orbit"><span className="mod-head__moon" /></span>
      </div>
      <div className="mod-head__text">
        <p className="latin mod-head__latin">
          {world.latin} · {world.body}
        </p>
        <h1 className="mod-head__title display">{world.module}</h1>
        <p className="mod-head__motto">{world.motto}</p>
        <p className="mod-head__desc">{world.description}</p>
        {total != null && (
          <p className="readout mod-head__count">
            <span className="led" /> {total} {unit}
          </p>
        )}
      </div>
      {children && <div className="mod-head__aside">{children}</div>}
    </header>
  );
}
