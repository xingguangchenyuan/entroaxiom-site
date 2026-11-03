import type { CSSProperties } from 'react';
import type { FileKind } from '../../content/types';

const KIND_COLOR: Record<FileKind, string> = {
  image: '#9fd6e0',
  pdf: '#ef8456',
  archive: '#e9bd5e',
  doc: '#ab93ff',
  other: '#72e0b9',
};

/** 文件图标：一块不规则的“陨石”，按类型着色，中间刻着扩展名 */
export function FileGlyph({ kind, ext, seed = 0 }: { kind: FileKind; ext: string; seed?: number }) {
  // 用 seed 微调多边形顶点，让每块陨石形状略有不同
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const r = 20 + (((seed * 7 + i * 13) % 7) - 3) * 1.1;
    return `${(26 + Math.cos(a) * r).toFixed(1)},${(26 + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <span className="rock" style={{ ['--c' as string]: KIND_COLOR[kind] } as CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 52 52" width="52" height="52">
        <polygon points={pts} className="rock__body" />
        <circle cx="19" cy="20" r="2.6" className="rock__pit" />
        <circle cx="32" cy="33" r="1.8" className="rock__pit" />
      </svg>
      <span className="rock__ext mono">{ext.slice(0, 4).toUpperCase()}</span>
    </span>
  );
}

export { KIND_COLOR };
