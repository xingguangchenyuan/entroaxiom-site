import { useRef } from 'react';
import { copy } from '../../config/site';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * 图片放大层（设计文档 §11.3）
 * - role=dialog aria-modal，Esc / 点击遮罩 / 右上角关闭按钮关闭；
 * - 焦点陷阱 + body 滚动锁（补偿滚动条宽度）。
 */
export function Lightbox({ src, alt, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(true, ref);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      ref={ref}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || copy.zoomAlt}
      onKeyDown={handleKey}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" className="lightbox-close" aria-label={copy.close} onClick={onClose}>
        ×
      </button>
      <img className="lightbox-img" src={src} alt={alt} />
    </div>
  );
}