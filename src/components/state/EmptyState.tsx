interface Props {
  message: string;
  hint?: string;
}

/** 空状态：一枚空轨道 + 文案。访客页面不出现“去上传”之类的引导 */
export function EmptyState({ message, hint }: Props) {
  return (
    <div className="state-empty" role="status">
      <svg className="state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.3">
        <circle cx="24" cy="24" r="16" strokeDasharray="2 5" />
        <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" />
      </svg>
      <p className="state-title">{message}</p>
      {hint && <p className="state-text">{hint}</p>}
    </div>
  );
}
