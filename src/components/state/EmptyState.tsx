interface Props {
  message: string;
}

/** 空状态：无色块图标 + 文案，不引导上传（设计文档 §8、§10） */
export function EmptyState({ message }: Props) {
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
        strokeLinejoin="round"
      >
        <path d="M4 7h12l3 3v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M16 10V7" />
      </svg>
      <p className="state-text">{message}</p>
    </div>
  );
}