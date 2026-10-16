import { useRef, type ReactNode } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Knob } from '../components/ui/Knob';

interface Props {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 确认对话框：焦点陷阱 + 滚动锁；Esc 取消。危险操作的确认按钮用红色旋钮 */
export function ConfirmDialog({ title, children, confirmLabel, danger, busy, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(true, ref);
  return (
    <div className="dialog" onKeyDown={(e) => e.key === 'Escape' && !busy && onCancel()}>
      <div className="dialog__scrim" onClick={() => !busy && onCancel()} aria-hidden="true" />
      <div className="dialog__box glass" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" ref={ref}>
        <h2 id="dlg-t" className="dialog__title display">{title}</h2>
        <div className="dialog__body">{children}</div>
        <div className="dialog__actions">
          <Knob tone="dark" size="sm" onClick={onCancel} disabled={busy}>取消</Knob>
          <Knob tone={danger ? 'danger' : 'gold'} size="sm" onClick={onConfirm} busy={busy}>{confirmLabel}</Knob>
        </div>
      </div>
    </div>
  );
}
