import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { welcomeCopy, SITE_NAME } from '../../config/site';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { Armillary } from './Armillary';
import { pulseSky, setSkyMode, useSkyMode } from '../sky/skyStore';

interface Props {
  /** 点「进入视界」/Enter/Esc 时立刻调用：首页在欢迎层淡出的同时于底下浮现（交叉溶解） */
  onEnter: () => void;
  /** 淡出动画播完、欢迎层该卸载时调用 */
  onExited?: () => void;
}

/** 离场动画时长：与 welcome.css 中 .welcome.is-leaving 的时长保持一致 */
/** 离场总时长：欢迎层淡去 0.55s → 首页延迟 0.5s 接力浮现 0.6s，约 1.15s 后卸载 */
const FADE_MS = 1150;

/**
 * 欢迎页：一台三维浑天仪悬在星海中央（见 Armillary.tsx）。
 * 仪器在右侧绕倾斜轴自转，文案退到左侧，像展签一样贴着仪器。
 */
export function WelcomeOverlay({ onEnter, onExited }: Props) {
  useSkyMode('welcome');
  const reduced = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const exitTimer = useRef(0);
  const begin = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    pulseSky();
    setSkyMode('home');
    // 首页立刻在欢迎层底下就位：淡出与浮现同时进行，交叉溶解而不是先消失再跳变
    onEnter();
    if (reduced) {
      onExited?.();
      return;
    }
    exitTimer.current = window.setTimeout(() => onExited?.(), FADE_MS);
  }, [onEnter, onExited, reduced]);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
      begin();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [begin]);

  const chars = Array.from(welcomeCopy.title);

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        // Esc 也走同一套离场流程，而不是把模态直接卸掉
        if (!next) begin();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content asChild onInteractOutside={(e) => e.preventDefault()}>
          <div className={`welcome${leaving ? ' is-leaving' : ''}`}>
      <div className="welcome__sphere">
        <Armillary />
      </div>

      <div className="welcome__intro">
        <p className="welcome__eyebrow latin">{SITE_NAME} · {welcomeCopy.lines[0]}</p>
        <Dialog.Title asChild>
          <h1 className="welcome__title display" aria-label={welcomeCopy.title}>
            {chars.map((c, i) => (
              <span key={i} className="welcome__char" aria-hidden="true" style={{ ['--d' as string]: `${0.25 + i * 0.09}s` }}>
                {c}
              </span>
            ))}
          </h1>
        </Dialog.Title>
        <span className="welcome__divider" aria-hidden="true" />
        <Dialog.Description asChild>
          <p className="welcome__sub">{welcomeCopy.sub}</p>
        </Dialog.Description>
        <button type="button" className="welcome__enter" onClick={begin} aria-label={welcomeCopy.enter} disabled={leaving}>
          <span className="welcome__enter-ring" aria-hidden="true" />
          <span className="welcome__enter-label">{welcomeCopy.enter}</span>
        </button>
          </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
