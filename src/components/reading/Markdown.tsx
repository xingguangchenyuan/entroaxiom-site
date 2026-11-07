import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import { copy } from '../../config/site';
import { classifyHref, withRetryParam } from '../../lib/links';
import { containsMath } from '../../lib/mathText';
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

/**
 * 正文链接：
 *  - 指向前端路由的站内链接走 <Link>（不整页刷新）；
 *  - 外链在新窗口打开，并带 noopener noreferrer；
 *  - 页内锚点（#xxx）、mailto:、静态文件（/uploads/…）等保持浏览器默认行为。
 */
function MdLink({ href, children }: { href?: string; children?: ReactNode }) {
  const target = classifyHref(href, window.location.origin);
  if (target.kind === 'internal') return <Link to={target.to}>{children}</Link>;
  if (target.kind === 'external') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return <a href={href}>{children}</a>;
}

function ImageNode({ src, alt }: { src?: string; alt?: string }) {
  // 正文里还留着 `asset:<id>`：那是后台编辑器对私密文件的内部引用，
  // 公开接口正常应该已经换成 /uploads/public/... 或去掉；真漏到前台时直接显示“未公开”，
  // 不要拿它去请求（必然 404），也不要给“重试”—— 重试一百次也不会变。
  const isInternalRef = !!src && src.startsWith('asset:');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [zoom, setZoom] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  // 地址里已有查询串时用 & 追加，不会拼出「?a=1?retry=1」
  const actualSrc = src ? withRetryParam(src, retryNonce) : src;

  if (isInternalRef) {
    return (
      <span className="md-img__fallback">
        <span>{copy.imagePrivate}</span>
      </span>
    );
  }

  return (
    <>
      <span className={`md-img${state === 'loading' ? ' is-loading' : ''}`}>
        {state !== 'error' && (
          <button type="button" className="md-img__btn" aria-label={copy.zoomAlt} onClick={() => actualSrc && setZoom(actualSrc)}>
            <img src={actualSrc} alt={alt ?? ''} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('error')} />
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

// 类型也从本地入口取：这个文件里不该再出现那个包名，
// 否则以后有人顺手把动态引入改回裸包时，看不出两者有什么区别
type KatexPlugin = typeof import('./katexPlugin').default;

/**
 * KaTeX 是整条渲染链里最大的一块（js 262 KB + css 29 KB，gzip 后约 90 KB），
 * 但绝大多数文章一个公式都没有。所以它不在首屏依赖里：只有正文真的含 $…$ 时才下载，
 * 样式也跟着同一批异步资源进来（只有 rehype-katex 会产出 .katex 标记）。
 * 模块级缓存 Promise：同一会话里第二篇带公式的文章不用再等一次。
 */
let katexLoader: Promise<KatexPlugin> | null = null;

function loadKatex(): Promise<KatexPlugin> {
  if (!katexLoader) {
    // 引入的是本地入口 katexPlugin.ts，不是裸包 —— 原因见那个文件顶部
    katexLoader = import('./katexPlugin')
      .then((mod) => mod.default)
      .catch((error: unknown) => {
        // 网络抖动导致的失败不该被永久记住，下次进页面还能重试
        katexLoader = null;
        throw error;
      });
  }
  return katexLoader;
}

/**
 * 正文渲染
 *  - remark-gfm：任务列表、表格、删除线（singleTilde:false，单个 ~ 不当删除线，"4~16 KB" 这类范围写法不会被划掉）
 *  - remark-math + rehype-katex：$行内$ 与 $$块级$$ 公式；写错的公式按原文显示，不会让整页崩溃。
 *    两个插件只在正文含公式时挂载，KaTeX 本体异步下载；下载完成前公式按原文（$…$）显示，
 *    下载失败也一样退回原文 —— 永远不出现空白正文。
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
  const hasMath = useMemo(() => containsMath(body), [body]);
  const [katex, setKatex] = useState<KatexPlugin | null>(null);

  useEffect(() => {
    if (!hasMath || katex) return;
    let alive = true;
    loadKatex()
      .then((plugin) => {
        // 插件本身是函数，useState 会把函数当 updater 执行，必须包一层
        if (alive) setKatex(() => plugin);
      })
      .catch(() => {
        /* 下载失败就保持原文显示，不打断阅读 */
      });
    return () => {
      alive = false;
    };
  }, [hasMath, katex]);

  useLayoutEffect(() => {
    if (!onHeadings) return;
    const root = rootRef.current;
    if (!root) return;
    const heads: Heading[] = [];
    root.querySelectorAll<HTMLElement>('h2, h3').forEach((el) => {
      if (el.id) heads.push({ id: el.id, text: headingText(el), level: el.tagName === 'H2' ? 2 : 3 });
    });
    onHeadings(heads);
    // katex 就绪后会重渲染一次，标题里的公式从原文变成排版结果，目录文字要跟着更新
  }, [body, onHeadings, katex]);

  return (
    <div className="prose" ref={rootRef}>
      <ReactMarkdown
        remarkPlugins={katex ? [[remarkGfm, { singleTilde: false }], remarkMath] : [[remarkGfm, { singleTilde: false }]]}
        rehypePlugins={katex ? [rehypeSlug, [katex, { strict: 'ignore', throwOnError: false }]] : [rehypeSlug]}
        components={{
          img: (props) => <ImageNode src={props.src} alt={props.alt} />,
          a: ({ href, children }) => <MdLink href={href}>{children}</MdLink>,
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
