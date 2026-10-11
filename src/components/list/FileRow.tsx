import type { FileItem } from '../../content/types';
import { formatBytes, formatDate, kindLabel } from '../../lib/format';

interface Props {
  file: FileItem;
}

function FileGlyph({ kind }: { kind: FileItem['kind'] }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg className="file-glyph" viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <path d="M6 3h8l4 4v14H6z" />
      {kind === 'image' && <circle cx="12" cy="12.5" r="2.2" />}
      {kind === 'pdf' && <path d="M10 11h4v6h-4zM9.5 11v6M14.5 11v6M8.5 13.5h3" />}
      {kind === 'archive' && (
        <>
          <path d="M9 9 7.5 3h9L15 9" />
          <rect x="8" y="9" width="8" height="12" rx="1" />
        </>
      )}
      {kind === 'doc' && <path d="M9 13h6M9 16h4" />}
      {kind === 'other' && <path d="M8 15h3" />}
    </svg>
  );
}

/**
 * 文件库行条目（设计文档 §8）
 * - 整行 hover 轻微提亮，点击打开详情/预览；不假装已下载；
 * - 超长文件名换行不撑破布局（word-break）。
 */
export function FileRow({ file }: Props) {
  const dateText = formatDate(file.updatedAt);
  return (
    <li>
      <a className="file-row" href={`/files/${file.id}`}>
        <FileGlyph kind={file.kind} />
        <span className="file-row-main">
          <span className="file-row-name">{file.name}</span>
          <span className="file-row-meta">
            <span className="file-row-kind">{kindLabel(file.kind)}</span>
            {dateText && <time className="file-row-date">{dateText}</time>}
          </span>
        </span>
        <span className="file-row-size">{formatBytes(file.size)}</span>
      </a>
    </li>
  );
}