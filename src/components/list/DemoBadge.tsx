import { copy } from '../../config/site';
import { isDemo } from '../../content/loader';

/** 「演示内容」标注（设计文档 §9.5，琥珀色徽标）。只在演示模式显示，正式内容不显示 */
export function DemoBadge() {
  if (!isDemo) return null;
  return <span className="demo-badge">{copy.demoBadge}</span>;
}
