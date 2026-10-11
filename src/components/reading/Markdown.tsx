import { useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { copy } from '../../config/site';
import { Lightbox } from './Lightbox';

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  body: string;
  /** 渲染完成后回传标题（来自 rehype-slug 的 id），供 Toc 使用 */
  onHeadings?: (headings: Heading[]) => void;
}

const TABLE_LABEL = '表格，可横向滚动';

function ImageNode({ src, alt }: { src?: string; alt?: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [zoom, setZoom] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const actualSrc = retryNonce > 0 ? `${src}?retry=${retryNonce}` : src;

  return (
    <>
      <span className="reading-image-wrap">
        {state !== 'error' && (
          <button
            type="button"
            className="reading-image-button"
            aria-label={copy.zoomAlt}
            onClick={() => actualSrc && setZoom(actualSrc)}
          >
            <img
              src={actualSrc}
              alt={alt ?? ''}
              loading="lazy"
              onLoad={() => setState('ready')}
              onError={() => setState('error')}
            />
          </button>
        )}
        {state === 'error' && (
          <span className="reading-image-fallback">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <circle cx="9" cy="9" r="1.5" />
              <path d="M4 17l5-5 4 4 3-3 4 4" />
            </svg>
            <span>{copy.imageFailed}</span>
            <button
              type="button"
              className="reading-image-retry"
              onClick={() => {
                setRetryNonce((n) => n + 1);
                setState('loading');
              }}
            >
              {copy.retry}
            </button>
          </span>
        )}
      </span>
      {zoom && <Lightbox src={zoom} alt={alt ?? ''} onClose={() => setZoom(null)} />}
    </>
  );
}

/**
 * 正文渲染（设计文档 §11）
 * - remark-gfm：任务列表、表格、删除线；
 * - rehype-slug：标题锚点 id，供目录跳转；
 * - 图片可点击放大、失败显示占位 + 重试；宽表格包 .table-scroll（仅容器内横滚）。
 */
export function Markdown({ body, onHeadings }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!onHeadings) return;
    const root = rootRef.current;
    if (!root) return;
    const heads: Heading[] = [];
    root.querySelectorAll<HTMLElement>('h2, h3').forEach((el) => {
      const id = el.id;
      if (id) {
        heads.push({ id, text: el.textContent ?? '', level: el.tagName === 'H2' ? 2 : 3 });
      }
    });
    onHeadings(heads);
  }, [body, onHeadings]);

  return (
    <div className="reading" ref={rootRef}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          img: (props) => <ImageNode src={props.src} alt={props.alt} />,
          table: (props) => (
            <div className="table-scroll" tabIndex={0} role="region" aria-label={TABLE_LABEL}>
              <table>{props.children}</table>
            </div>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}