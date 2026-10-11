import { useState } from 'react';
import type { WallpaperConfig } from '../../config/wallpapers';

/**
 * 壁纸图片本体（设计文档 §4）：桌面/移动两档 picture + 遮罩。
 * - 加载完成淡入；onError 隐藏本体，露出 backdrop 底色；
 * - 纯装饰 aria-hidden。
 */
export function WallpaperPicture({ config }: { config: WallpaperConfig }) {
  const [desktopReady, setDesktopReady] = useState(false);
  const [mobileReady, setMobileReady] = useState(false);
  const { overlay } = config;

  return (
    <>
      <picture
        className="wallpaper-picture wallpaper-desktop"
        style={{ opacity: desktopReady ? 1 : 0 }}
      >
        <source srcSet={config.desktop.avif} type="image/avif" media="(min-width: 768px)" />
        <source srcSet={config.desktop.webp} type="image/webp" media="(min-width: 768px)" />
        <img
          src={config.desktop.fallback}
          alt=""
          width={config.desktop.width}
          height={config.desktop.height}
          style={{ objectPosition: config.focus.desktop }}
          onLoad={() => setDesktopReady(true)}
          onError={() => setDesktopReady(false)}
        />
      </picture>
      <picture
        className="wallpaper-picture wallpaper-mobile"
        style={{ opacity: mobileReady ? 1 : 0 }}
      >
        <source srcSet={config.mobile.avif} type="image/avif" media="(max-width: 767px)" />
        <source srcSet={config.mobile.webp} type="image/webp" media="(max-width: 767px)" />
        <img
          src={config.mobile.fallback}
          alt=""
          width={config.mobile.width}
          height={config.mobile.height}
          style={{ objectPosition: config.focus.mobile }}
          onLoad={() => setMobileReady(true)}
          onError={() => setMobileReady(false)}
        />
      </picture>
      {overlay.mode === 'scrim' && overlay.strength > 0 && (
        <div
          className="wallpaper-scrim"
          style={{ backgroundColor: `rgba(0, 0, 0, ${overlay.strength})` }}
        />
      )}
      {overlay.mode === 'spotlight' && overlay.strength > 0 && (
        <div className="wallpaper-spotlight" style={{ opacity: overlay.strength }} />
      )}
    </>
  );
}