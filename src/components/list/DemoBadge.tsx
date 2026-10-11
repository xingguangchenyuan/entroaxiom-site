import { copy } from '../../config/site';

/** 「演示内容」标注（设计文档 §9.5，琥珀色徽标） */
export function DemoBadge() {
  return <span className="demo-badge">{copy.demoBadge}</span>;
}