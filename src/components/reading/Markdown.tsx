import { useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import { copy } from '../../config/site';
import { Lightbox } from './Lightbox';

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  body: string;
  /** 渲染完成后回传标题（来自 rehype-slug 的 id），供目录使用 */
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
      <span className={`md-img${state === 'loading' ? ' is-loading' : ''}`}>
        {state !== 'error' && (
          <button type="button" className="md-img__btn" aria-label={copy.zoomAlt} onClick={() => actualSrc && setZoom(actualSrc)}>
            <img src={actualSrc} alt={alt ?? ''} loading="lazy" onLoad={() => setState('ready')} onError={() => setState('error')} />
          </button>
        )}
        {state === 'error' && (
          <span className="md-img__fallback">
            <span>{copy.imageFailed}</span>
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setRetryNonce((n) => n + 1);
                setState('loading');
              }}
            >
              {copy.retry}
            </button>
          </span>
        )}
        {alt && state === 'ready' && <span className="md-img__cap">{alt}</span>}
      </span>
      {zoom && <Lightbox src={zoom} alt={alt ?? ''} onClose={() => setZoom(null)} />}
    </>
  );
}

/**
 * 正文渲染
 *  - remark-gfm：任务列表、表格、删除线（singleTilde:false，单个 ~ 不当删除线，"4~16 KB" 这类范围写法不会被划掉）
 *  - remark-math + rehype-katex：$行内$ 与 $$块级$$ 公式；写错的公式按原文显示，不会让整页崩溃
 *  - rehype-slug：标题锚点 id，供目录跳转
 *  - 图片可点击放大、失败显示占位 + 重试；宽表格包 .table-scroll（仅容器内横滚）
 */
/** 标题纯文本：KaTeX 会附带一份 MathML（读屏用），取目录文字时要去掉，否则公式会出现两遍 */
function headingText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.katex-mathml').forEach((n) => n.remove());
  return clone.textContent ?? '';
}

export function Markdown({ body, onHeadings }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!onHeadings) return;
    const root = rootRef.current;
    if (!root) return;
    const heads: Heading[] = [];
    root.querySelectorAll<HTMLElement>('h2, h3').forEach((el) => {
      if (el.id) heads.push({ id: el.id, text: headingText(el), level: el.tagName === 'H2' ? 2 : 3 });
    });
    onHeadings(heads);
  }, [body, onHeadings]);

  return (
    <div className="prose" ref={rootRef}>
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkMath]}
        rehypePlugins={[rehypeSlug, [rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
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
