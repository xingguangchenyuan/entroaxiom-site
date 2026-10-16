import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/format';
import { IconArrow } from '../ui/Icons';

interface Props {
  to: string;
  title: string;
  summary?: string;
  category?: string;
  tags?: string[];
  updated?: string;
  date?: string;
}

/** 笔记/总结列表条目：整行可点；摘要最多两行；缺失字段不渲染 */
export function ListItem({ to, title, summary, category, tags, updated, date }: Props) {
  const dateText = formatDate(updated, date);
  return (
    <li>
      <Link className="item lit" to={to}>
        <span className="item__main">
          <span className="item__title">{title}</span>
          {summary && <span className="item__summary">{summary}</span>}
          {(category || (tags && tags.length > 0)) && (
            <span className="item__tags">
              {category && <span className="tag tag--gold">{category}</span>}
              {tags?.slice(0, 4).map((t) => <span key={t} className="tag">{t}</span>)}
            </span>
          )}
        </span>
        <span className="item__side">
          {dateText && <time className="item__date">{dateText}</time>}
          <IconArrow className="item__arrow" size={18} />
        </span>
      </Link>
    </li>
  );
}
