import { useEffect } from 'react';
import { wallpapers, pickWallpaperTier, preloadWallpaper } from '../../config/wallpapers';
import { welcomeCopy } from '../../config/site';
import { WallpaperPicture } from '../layout/WallpaperPicture';
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
 * 欢迎层（设计文档 §5、§6.1）
 * - position: fixed 全屏覆在首页之上（z-200），首页始终挂载，进入即交叉淡化；
 * - 挂载时按当前断点预加载首页壁纸，点击时未就绪也照常进入（底色承接，就绪后 400ms 淡入）；
 * - 不逐字打字、不强制片头；h1 是欢迎层唯一页主标题，进入后由首页接管。
 */
export function WelcomeOverlay({ closing, onEnter, onClosed }: Props) {
  useEffect(() => {
    preloadWallpaper(pickWallpaperTier(wallpapers.site));
  }, []);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClosed();
  };

  return (
    <div
      className={`welcome-overlay${closing ? ' welcome-overlay-closing' : ''}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="welcome-art" aria-hidden="true">
        <WallpaperPicture config={wallpapers.welcome} />
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
            <span className="welcome-pill-dot" /> 从无序出发 · 寻找确定
          </span>
          <h1 className="welcome-title"><span>{welcomeCopy.title}</span></h1>
          <p className="welcome-sub">{welcomeCopy.sub}</p>
          <button type="button" className="welcome-enter" onClick={onEnter}>
            <span>{welcomeCopy.enter}</span>
          </button>
        </div>
        <div className="welcome-footer" aria-hidden="true">
          <span>ENTROPY / AXIOM</span>
          <span className="welcome-footer-line" />
          <span>向未知，建立坐标</span>
        </div>
      </div>
    </div>
  );
}