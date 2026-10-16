import { useCallback, useEffect, useRef, useState } from 'react';
import { welcomeCopy } from '../../config/site';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { pulseSky, setSkyMode, useSkyMode } from '../sky/skyStore';
import { Knob } from '../ui/Knob';

interface Props {
  onEnter: () => void;
}

/** 离场动画时长：与 welcome.css 中 .welcome.is-leaving 的时长保持一致 */
const LEAVE_MS = 1400;

/**
 * 欢迎页：黑洞居中，标题一字一字浮现。
 * 进入时的“仪式”：金光一闪 → 黑洞滑向首页的位置（由天空层完成）→ 文字沉入虚空 → 首页浮现。
 */
export function WelcomeOverlay({ onEnter }: Props) {
  useSkyMode('welcome');
  const reduced = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const begin = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    pulseSky();
    setSkyMode('home');
    window.setTimeout(onEnter, reduced ? 0 : LEAVE_MS);
  }, [onEnter, reduced]);

  // 在页面任意位置按 Enter 即可进入（焦点在按钮上时由按钮自己处理，避免重复触发）
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

  useEffect(() => {
    const id = window.setTimeout(() => btnRef.current?.focus({ preventScroll: true }), reduced ? 0 : 1600);
    return () => window.clearTimeout(id);
  }, [reduced]);

  const chars = Array.from(welcomeCopy.title);

  return (
    <div className={`welcome${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome__vertical display" aria-hidden="true">
        {welcomeCopy.lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>

      <div className="welcome__top">
        <h1 id="welcome-title" className="welcome__title display" aria-label={welcomeCopy.title}>
          {chars.map((c, i) => (
            <span key={i} className="welcome__char" aria-hidden="true" style={{ ['--d' as string]: `${0.25 + i * 0.09}s` }}>
              {c}
            </span>
          ))}
        </h1>
        <p className="welcome__sub">{welcomeCopy.sub}</p>
      </div>

      <div className="welcome__bottom">
        <div className="welcome__enter" ref={(el: HTMLDivElement | null) => { btnRef.current = el?.querySelector('button') ?? null; }}>
          <Knob size="lg" onClick={begin} busy={leaving} aria-label={welcomeCopy.enter}>
            {welcomeCopy.enter}
          </Knob>
        </div>
        <p className="welcome__hint">{welcomeCopy.hint}</p>
      </div>
    </div>
  );
}
