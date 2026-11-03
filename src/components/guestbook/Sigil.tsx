import type { CSSProperties } from 'react';
import type { SigilKey } from '../../content/types';

/** 七个古典行星符号 —— 留言者可以选一个作为自己的“星符” */
export const SIGIL_META: Record<SigilKey, { glyph: string; name: string; color: string }> = {
  sun: { glyph: '☉', name: '太阳', color: '#e9bd5e' },
  moon: { glyph: '☽', name: '月亮', color: '#d4f3f7' },
  mercury: { glyph: '☿', name: '水星', color: '#9fd6e0' },
  venus: { glyph: '♀', name: '金星', color: '#f2a7c3' },
  mars: { glyph: '♂', name: '火星', color: '#ef8456' },
  jupiter: { glyph: '♃', name: '木星', color: '#ab93ff' },
  saturn: { glyph: '♄', name: '土星', color: '#72e0b9' },
};

export const SIGIL_KEYS = Object.keys(SIGIL_META) as SigilKey[];

export function Sigil({ sigil, size = 28 }: { sigil: SigilKey; size?: number }) {
  const m = SIGIL_META[sigil] ?? SIGIL_META.sun;
  return (
    <span
      className="sigil"
      style={{ ['--c' as string]: m.color, width: size, height: size, fontSize: size * 0.56 } as CSSProperties}
      title={m.name}
      aria-hidden="true"
    >
      {/* U+FE0E 强制文本样式，避免被渲染成 emoji */}
      {m.glyph}
      {'\uFE0E'}
    </span>
  );
}
