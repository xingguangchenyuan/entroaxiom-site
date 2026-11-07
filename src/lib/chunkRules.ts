/**
 * 构建时的手动分包规则（vite.config.ts 的 manualChunks 用它）。
 * 放在 src/lib 里是为了能被单元测试直接 import，而不是在测试里复制一份正则。
 * 注意模块 id 里的分隔符在 Windows 上可能是反斜杠，所以统一用 [\\/]。
 *
 * 这里只剩 React 一条规则 —— 曾经还有 markdown 链和 KaTeX 两条，后来被实测推翻了：
 * 只要 markdown 链被切成手动块，Rollup 就会在 markdown 块顶部补一条
 * `import "./katex-xxx.js"` 的副作用引入，并在构建时直接警告
 * `Circular chunk: katex -> markdown -> katex`。原因是 rehype-katex 依赖的
 * hast-util-to-text / unist-util-visit 也被 MARKDOWN 规则切进了 markdown 块，
 * 两块互相依赖，于是「按需加载 KaTeX」名存实亡：实测无公式的文章照样下载 259 KB。
 *
 * 现在 markdown 链和 KaTeX 都交给 Rollup 自动分块：
 *  - 正文渲染链跟着 ArticlePage 的异步块走（约 184 KB，只在详情页加载）；
 *  - KaTeX 跟着 katexPlugin.ts 那块异步块走（约 270 KB，只在正文含 $…$ 时才请求）。
 * 回归测试 tests/regressions.test.cjs 里有断言盯着这两条。
 */
const REACT = /[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/;

export type ChunkName = 'react';

export function chunkFor(id: string): ChunkName | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (REACT.test(id)) return 'react';
  return undefined;
}
