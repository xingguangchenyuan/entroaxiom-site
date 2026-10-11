import type { WallpaperConfig } from '../../config/wallpapers';
import { WallpaperPicture } from './WallpaperPicture';

interface Props {
  config: WallpaperConfig;
}

/**
 * 壁纸层（设计文档 §4）：固定铺满背景，内容层之下。
 * （背景图与遮罩由 WallpaperPicture 渲染。）
 */
export function WallpaperLayer({ config }: Props) {
  return (
    <div className="wallpaper-layer" aria-hidden="true">
      <WallpaperPicture config={config} />
    </div>
  );
}