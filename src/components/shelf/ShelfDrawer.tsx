import { useRef, useState, type CSSProperties } from 'react';
import type { ShelfItem, ShelfKind, ShelfStatus } from '../../content/types';
import { copy } from '../../config/site';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Stars } from './Stars';
import { IconBook, IconClose, IconDisc, IconExternal, IconFilm } from '../ui/Icons';

export const SHELF_KIND: Record<ShelfKind, { label: string; latin: string; color: string }> = {
  book: { label: '书', latin: 'Liber', color: '#e9bd5e' },
  film: { label: '影', latin: 'Lumen', color: '#ef8456' },
  music: { label: '音', latin: 'Sonus', color: '#72e0b9' },
};
export const SHELF_STATUS: Record<ShelfStatus, string> = { done: '已抵达', doing: '航行中', want: '待观测' };

export function KindIcon({ kind, size = 16 }: { kind: ShelfKind; size?: number }) {
  return kind === 'book' ? <IconBook size={size} /> : kind === 'film' ? <IconFilm size={size} /> : <IconDisc size={size} />;
}

/** 由标题生成稳定的“星云封面”参数（无封面图时使用） */
export function coverSeed(title: string): { a: number; b: number; x: number; y: number } {
  let h = 2166136261;
  for (const ch of title) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return { a: h % 360, b: (h >>> 9) % 360, x: 20 + ((h >>> 3) % 60), y: 20 + ((h >>> 13) % 60) };
}

export function Cover({ item }: { item: ShelfItem }) {
  const s = coverSeed(item.title);
  const style = {
    ['--ca' as string]: `hsl(${s.a} 70% 62%)`,
    ['--cb' as string]: `hsl(${s.b} 60% 30%)`,
    ['--cx' as string]: `${s.x}%`,
    ['--cy' as string]: `${s.y}%`,
  } as CSSProperties;
  // 封面图加载失败（文件被删、地址不对、或后台漏转换）时退回“星云封面”，
  // 不要留一个破图占位 —— 卡片视图和抽屉里都会用到这个组件
  const [broken, setBroken] = useState(false);
  const showImage = !!item.cover && !broken;
  return (
    <span className={`cover cover--${item.kind}`} style={style} aria-hidden="true">
      {showImage ? (
        <img src={item.cover} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="cover__title display">{item.title}</span>
      )}
      <span className="cover__kind"><KindIcon kind={item.kind} size={14} /></span>
    </span>
  );
}

export function ShelfDrawer({ item, onClose }: { item: ShelfItem; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(true, ref, { onEscape: onClose });
  const k = SHELF_KIND[item.kind];
  return (
    <div className="drawer" role="presentation">
      <button type="button" className="drawer__scrim" data-overlay-scrim aria-label={copy.close} onClick={onClose} />
      <div className="drawer__panel" ref={ref} role="dialog" aria-modal="true" aria-labelledby="drawer-title" style={{ ['--c' as string]: k.color } as CSSProperties}>
        <button type="button" className="drawer__close" onClick={onClose} aria-label={copy.close}>
          <IconClose size={18} />
        </button>
        <Cover item={item} />
        <p className="latin drawer__latin">{k.latin} · {SHELF_STATUS[item.status]}</p>
        <h2 id="drawer-title" className="drawer__title display">{item.title}</h2>
        <p className="drawer__creator">
          {item.creator}
          {item.year && <span className="readout"> · {item.year}</span>}
        </p>
        {item.rating != null && <Stars value={item.rating} size={18} />}
        {item.quote && <blockquote className="drawer__quote">{item.quote}</blockquote>}
        {item.review && <p className="drawer__review">{item.review}</p>}
        {(item.tags?.length ?? 0) > 0 && (
          <p className="drawer__tags">{item.tags!.map((t) => <span key={t} className="tag">{t}</span>)}</p>
        )}
        <p className="readout drawer__date">{item.date ? `记于 ${item.date}` : ''}</p>
        {item.link && (
          <a className="text-action" href={item.link} target="_blank" rel="noreferrer noopener">
            外部链接 <IconExternal size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
