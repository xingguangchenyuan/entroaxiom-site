/**
 * 壁纸配置（设计文档 §4.2）——页面与组件一律从这里取路径，不得硬编码。
 *
 * 图片产物由 `npm run images`（scripts/prepare-images.mjs）生成到
 * public/media/，本文件记录其实际像素尺寸。换图流程见 README。
 *
 * 关于 focus（取值依据：2026 年生成的产物做像素分析测得，非肉眼观察——
 * 实现时模型无法看图，故按测得的主体带取值，并在交付说明中保留肉眼复核步骤）：
 * - 欢迎图源 1000055228_x16_drawing.png（6688×3764，深底亮线稿）：
 *   亮（主体）像素垂直分布集中在 33%~58% 带，中位数 ~46%；
 *   桌面 50% 45%（主体居中偏高）；移动竖屏几乎不裁上下（crop 发生在横向），
 *   50% 30% 在横屏手机上也能保留主体。
 * - 网站图源 1774693.jpeg（8397×4710，横版）：细节密度分布均匀（42~61），
 *   中位细节带 ~63%（中下部略多）；桌面 50% 50%；移动 50% 40%（轻度上偏）。
 */

export interface WallpaperSource {
  avif: string;
  webp: string;
  fallback: string; // jpg/png
  width: number;
  height: number;
}

export interface WallpaperConfig {
  desktop: WallpaperSource;
  mobile: WallpaperSource;
  /** CSS object-position，决定裁切焦点 */
  focus: { desktop: string; mobile: string };
  /** 遮罩：none=不加；scrim=整体极淡压暗；spotlight=仅文字区域局部柔边 */
  overlay: { mode: 'none' | 'scrim' | 'spotlight'; strength: number };
  /** 加载中与加载失败时的底色，中性色，与图片无关 */
  backdrop: string;
}

const welcomeDesktop = {
  avif: '/media/welcome-desktop.avif',
  webp: '/media/welcome-desktop.webp',
  fallback: '/media/welcome-desktop.jpg',
  width: 2560,
  height: 1441,
};

const welcomeMobile = {
  avif: '/media/welcome-mobile.avif',
  webp: '/media/welcome-mobile.webp',
  fallback: '/media/welcome-mobile.jpg',
  width: 1280,
  height: 720,
};

const siteDesktop = {
  avif: '/media/site-desktop.avif',
  webp: '/media/site-desktop.webp',
  fallback: '/media/site-desktop.jpg',
  width: 2560,
  height: 1436,
};

const siteMobile = {
  avif: '/media/site-mobile.avif',
  webp: '/media/site-mobile.webp',
  fallback: '/media/site-mobile.jpg',
  width: 1280,
  height: 718,
};

export const wallpapers: { welcome: WallpaperConfig; site: WallpaperConfig } = {
  welcome: {
    desktop: welcomeDesktop,
    mobile: welcomeMobile,
    focus: { desktop: '50% 45%', mobile: '50% 30%' },
    overlay: { mode: 'spotlight', strength: 0.38 },
    backdrop: '#EDEBE7',
  },
  site: {
    desktop: siteDesktop,
    mobile: siteMobile,
    focus: { desktop: '50% 50%', mobile: '50% 40%' },
    overlay: { mode: 'none', strength: 0 },
    backdrop: '#EDEBE7',
  },
};

/** 选择当前断点对应的档位（≤768px 用移动档），供预加载使用 */
export function pickWallpaperTier(config: WallpaperConfig): WallpaperSource {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
    ? config.mobile
    : config.desktop;
}

/** 预加载一张壁纸（不等待，用于欢迎页挂载时提前拉首页壁纸） */
export function preloadWallpaper(source: WallpaperSource): void {
  const img = new Image();
  img.src = source.fallback;
}