import { welcomeCopy } from '../../config/site';
import { CosmicScene } from '../art/CosmicScene';
import { AxiomMark } from '../layout/AxiomMark';

interface Props {
  /** 是否正在淡出（等待 onClosed 卸载） */
  closing: boolean;
  /** 点击「进入网站」 */
  onEnter: () => void;
  /** 淡出动画结束（由父组件决定 reduced-motion 时是否立即触发） */
  onClosed: () => void;
}

/**
 * 欢迎层：实时绘制的引力透镜作为入口视觉，淡出后由首页接管焦点。
 */
export function WelcomeOverlay({ closing, onEnter, onClosed }: Props) {
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClosed();
  };

  return (
    <div
      className={`welcome-overlay${closing ? ' welcome-overlay-closing' : ''}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="welcome-art" aria-hidden="true">
        <CosmicScene scene="lens" />
      </div>
      <div className="welcome-veil" aria-hidden="true" />
      <div className="welcome-orbit welcome-orbit-one" aria-hidden="true" />
      <div className="welcome-orbit welcome-orbit-two" aria-hidden="true" />
      <div className="welcome-layout">
        <div className="welcome-masthead" aria-hidden="true">
          <AxiomMark className="welcome-mark" />
          <span className="welcome-name">entroaxiom</span>
        </div>
        <div className="welcome-body">
          <span className="welcome-pill" aria-hidden="true">
            <span className="welcome-pill-dot" /> 一个人的宇宙 · 一座思想的观测站
          </span>
          <h1 className="welcome-title"><span>{welcomeCopy.title}</span></h1>
          <p className="welcome-sub">{welcomeCopy.sub}</p>
          <button type="button" className="welcome-enter" onClick={onEnter}>
            <span>{welcomeCopy.enter}</span>
          </button>
        </div>
        <div className="welcome-footer" aria-hidden="true">
          <span>PERSONAL SPACE / ENTROAXIOM</span>
          <span className="welcome-footer-line" />
          <span>向未知，建立坐标</span>
        </div>
      </div>
    </div>
  );
}