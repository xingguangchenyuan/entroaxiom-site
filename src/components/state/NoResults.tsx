import { copy } from '../../config/site';
import { IconSearch } from '../ui/Icons';
import { Knob } from '../ui/Knob';

interface Props {
  onClear: () => void;
}

/** 有内容但筛不出：没有匹配的结果 + 清除筛选 */
export function NoResults({ onClear }: Props) {
  return (
    <div className="state-empty" role="status">
      <IconSearch size={34} className="state-icon" />
      <p className="state-title">{copy.noResults}</p>
      <div className="state-actions">
        <Knob tone="dark" size="sm" onClick={onClear}>{copy.clearFilters}</Knob>
      </div>
    </div>
  );
}
