interface Props {
  /** 全部 + 从内容自动汇总的分类 */
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
  counts?: Record<string, number>;
  label?: string;
}

/** 分类筛选：可按压的 chip，单选，带 aria-pressed；取值集合由现有内容汇总，不预置 */
export function CategoryFilter({ categories, active, onSelect, counts, label = '按分类筛选' }: Props) {
  return (
    <div className="filter-row" role="group" aria-label={label}>
      {categories.map((cat) => (
        <button key={cat} type="button" className="chip" aria-pressed={cat === active} onClick={() => onSelect(cat)}>
          {cat}
          {counts && counts[cat] !== undefined && <span className="chip__n">{counts[cat]}</span>}
        </button>
      ))}
    </div>
  );
}
