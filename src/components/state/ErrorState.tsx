import { copy } from '../../config/site';
import { Knob } from '../ui/Knob';

interface Props {
  /** 仅真实可重试时传入，否则不渲染按钮 */
  onRetry?: () => void;
  message?: string;
}

export function ErrorState({ onRetry, message }: Props) {
  return (
    <div className="state-error" role="alert">
      <p className="state-title">{copy.loadFailed}</p>
      {message && <p className="state-text">{message}</p>}
      {onRetry && (
        <div className="state-actions">
          <Knob tone="dark" size="sm" onClick={onRetry}>{copy.retry}</Knob>
        </div>
      )}
    </div>
  );
}
