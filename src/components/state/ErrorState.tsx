import { copy } from '../../config/site';

interface Props {
  /** 仅真实可重试时传入，否则不渲染（设计文档 §10：不放无作用按钮） */
  onRetry?: () => void;
}

/** 加载失败（设计文档 §10、§14.3） */
export function ErrorState({ onRetry }: Props) {
  return (
    <div className="state-error" role="alert">
      <p className="state-text">{copy.loadFailed}</p>
      {onRetry && (
        <button type="button" className="state-action" onClick={onRetry}>
          {copy.retry}
        </button>
      )}
    </div>
  );
}