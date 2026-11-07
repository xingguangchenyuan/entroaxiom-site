/**
 * KaTeX 的唯一入口：插件与样式都在这里静态引入。
 *
 * 为什么不直接在 Markdown.tsx 里写 import('rehype-katex')：
 * manualChunks 会把 rehype-katex / katex 切成独立的 'katex' 块，而 Rollup 为了保住
 * 模块执行顺序，会在 markdown 块顶部补一条副作用引入 `import "./katex-xxx.js"`——
 * 结果只要正文渲染器被加载，那 290 KB 就跟着下来了，按需加载等于没做。
 *
 * 改成「动态引入这个本地文件」之后，rehype-katex 与它的样式只被这个文件静态依赖，
 * 于是它们只跟着这块极小的异步块走：正文含公式时才下载，不含公式的页面一个字节都不碰。
 */
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default rehypeKatex;
