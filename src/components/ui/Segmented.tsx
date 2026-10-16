interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  label: string;
}

/** 分段控制：滑块用 CSS 变量定位，切换时有弹性滑动 */
export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={{ ['--n' as string]: options.length, ['--i' as string]: i }}>
      <span className="seg__thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-pressed={o.value === value} className="seg__item" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
