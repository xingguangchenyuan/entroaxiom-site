import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconCheck, IconClose } from '../components/ui/Icons';

type Tone = 'ok' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}
interface ToastApi {
  push: (text: string, tone?: Tone) => void;
}
const Ctx = createContext<ToastApi | null>(null);

/** 轻提示：右下角玻璃条，3.6 秒后消失；错误提示停留更久（6 秒）。aria-live 区域读屏可感知 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (text: string, tone: Tone = 'ok') => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-3), { id, tone, text }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3600);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ push }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast glass glass--sm toast--${t.tone}`}>
            {t.tone === 'ok' ? <IconCheck size={16} /> : <span className={`led ${t.tone === 'error' ? '' : 'led--warn'}`} />}
            <span className="toast__text">{t.text}</span>
            <button type="button" className="toast__x" aria-label="关闭提示" onClick={() => dismiss(t.id)}>
              <IconClose size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast 必须在 ToastProvider 内使用');
  return v;
}
