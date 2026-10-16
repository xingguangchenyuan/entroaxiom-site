import { type ReactNode } from 'react';
import { DemoBadge } from './DemoBadge';

interface Props {
  title: string;
  lead: string;
  total?: number;
  unit?: string;
  children?: ReactNode;
}

/** 列表页页头：标题 + 一句注脚 + 总数 */
export function ModuleHeader({ title, lead, total, unit = '篇', children }: Props) {
  return (
    <header className="page__head">
      <h1 className="page__title display">{title}</h1>
      <p className="page__lead">{lead}</p>
      <div className="page__meta">
        {total !== undefined && <span className="tag">{`共 ${total} ${unit}`}</span>}
        <DemoBadge />
        {children}
      </div>
    </header>
  );
}
