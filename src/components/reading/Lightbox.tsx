import { useRef } from 'react';
import { copy } from '../../config/site';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconClose } from '../ui/Icons';

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

/** 图片放大层：role=dialog aria-modal；Esc / 点击遮罩 / 关闭按钮关闭；焦点陷阱 + 滚动锁 */
export function Lightbox({ src, alt, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(true, ref);

  return (
    <div
      ref={ref}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || copy.zoomAlt}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button type="button" className="lightbox__close" aria-label={copy.close} onClick={onClose}>
        <IconClose size={20} />
      </button>
      <img className="lightbox__img" src={src} alt={alt} />
    </div>
  );
}
