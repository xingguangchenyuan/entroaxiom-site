interface Props {
  /** 全部 + 从内容自动汇总的分类 */
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
}

/**
 * 分类筛选（设计文档 §10）
 * - 默认「全部」；取值集合由现有内容自动汇总，不预置；
 * - 单选，chip 带 aria-pressed。
 */
export function CategoryFilter({ categories, active, onSelect }: Props) {
  return (
    <div className="filter-row" role="group" aria-label="按分类筛选">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          className={`filter-chip${cat === active ? ' filter-chip-active' : ''}`}
          aria-pressed={cat === active}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}