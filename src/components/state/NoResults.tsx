import { copy } from '../../config/site';

interface Props {
  /** 一键清空关键词与分类 */
  onClear: () => void;
}

/** 有内容但筛不出时（设计文档 §10）：没有匹配的结果 + 清除筛选 */
export function NoResults({ onClear }: Props) {
  return (
    <div className="state-empty" role="status">
      <svg
        className="state-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
      <p className="state-text">{copy.noResults}</p>
      <button type="button" className="state-action" onClick={onClear}>
        {copy.clearFilters}
      </button>
    </div>
  );
}