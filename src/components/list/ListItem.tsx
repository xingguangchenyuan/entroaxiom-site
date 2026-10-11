import { formatDate } from '../../lib/format';

interface Props {
  href: string;
  title: string;
  summary?: string;
  category?: string;
  updated?: string;
  date?: string;
}

/**
 * 笔记/总结列表条目（设计文档 §8）
 * - 紧凑行条目：标题、摘要（最多两行省略）、分类、更新时间；
 * - 缺失字段不渲染；整行可点击。
 */
export function ListItem({ href, title, summary, category, updated, date }: Props) {
  const dateText = formatDate(updated, date);
  return (
    <li>
      <a className="list-item" href={href}>
        <span className="list-item-title">{title}</span>
        {summary && <span className="list-item-summary">{summary}</span>}
        {(category || dateText) && (
          <span className="list-item-meta">
            {category && <span className="list-item-cat">{category}</span>}
            {dateText && <time className="list-item-date">{dateText}</time>}
          </span>
        )}
      </a>
    </li>
  );
}