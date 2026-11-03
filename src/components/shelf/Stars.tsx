/** 评分：五颗小星，支持半星。纯展示，带可读的 aria-label */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <span className="stars" role="img" aria-label={`评分 ${v} / 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={`st-${i}-${Math.round(fill * 10)}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.18" />
              </linearGradient>
            </defs>
            <path d="m12 2.8 2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z" fill={`url(#st-${i}-${Math.round(fill * 10)})`} />
          </svg>
        );
      })}
    </span>
  );
}
