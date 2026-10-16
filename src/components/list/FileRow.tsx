import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FileItem } from '../../content/types';
import { formatBytes, formatDate, kindLabel } from '../../lib/format';
import { IconArrow } from '../ui/Icons';

export function FileGlyph({ kind, ext }: { kind: FileItem['kind']; ext: string }) {
  return (
    <span className={`fglyph fglyph--${kind}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4" />
        {kind === 'image' && <><circle cx="10.5" cy="12" r="1.3" /><path d="m7.5 18 3.5-3.5 2.5 2.5 2-2 1.5 1.5" /></>}
        {kind === 'pdf' && <path d="M9 12h6M9 15h6M9 18h3" />}
        {kind === 'archive' && <path d="M12 9v2m0 2v2m0 2v1" />}
        {kind === 'doc' && <path d="M9 12h6M9 15h6M9 18h4" />}
        {kind === 'other' && <path d="M9 14h6" />}
      </svg>
      <span className="fglyph__ext">{ext.slice(0, 4)}</span>
    </span>
  );
}

/** 文件库行：图片显示缩略图（加载失败回退图标）；超长文件名换行不撑破布局 */
export function FileRow({ file }: { file: FileItem }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const dateText = formatDate(file.updatedAt);
  const thumb = file.kind === 'image' && file.src && !thumbFailed;
  return (
    <li>
      <Link className="item item--file lit" to={`/files/${file.id}`}>
        {thumb ? (
          <span className="fthumb" aria-hidden="true">
            <img src={file.src} alt="" loading="lazy" decoding="async" onError={() => setThumbFailed(true)} />
          </span>
        ) : (
          <FileGlyph kind={file.kind} ext={file.ext} />
        )}
        <span className="item__main">
          <span className="item__title item__title--file">{file.name}</span>
          <span className="item__tags">
            <span className="tag">{kindLabel(file.kind)}</span>
            {dateText && <time className="item__date">{dateText}</time>}
          </span>
        </span>
        <span className="item__side">
          <span className="item__size">{formatBytes(file.size)}</span>
          <IconArrow className="item__arrow" size={18} />
        </span>
      </Link>
    </li>
  );
}
