import { ALL } from '../../hooks/useListQuery';

interface Props {
  categories: string[];
  counts: Record<string, number>;
  active: string;
  onSelect: (c: string) => void;
  label?: string;
}

/** 分类筛选：一排可按下的星芯标签 */
export function CategoryFilter({ categories, counts, active, onSelect, label = '按分类筛选' }: Props) {
  if (categories.length === 0) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="filter-row" role="group" aria-label={label}>
      {[ALL, ...categories].map((c) => (
        <button key={c} type="button" className="chip" aria-pressed={active === c} onClick={() => onSelect(c)}>
          {c}
          <span className="chip__n">{c === ALL ? total : counts[c] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
