/**
 * 构建时的手动分包规则（vite.config.ts 的 manualChunks 用它）。
 * 放在 src/lib 里是为了能被单元测试直接 import，而不是在测试里复制一份正则。
 * 注意模块 id 里的分隔符在 Windows 上可能是反斜杠，所以统一用 [\\/]。
 */
const KATEX = /[\\/](katex|rehype-katex|remark-math)[\\/]/;
const MARKDOWN =
  /[\\/](react-markdown|remark-[^\\/]+|rehype-[^\\/]+|micromark[^\\/]*|mdast-[^\\/]+|hast-[^\\/]+|unified|vfile[^\\/]*|unist-[^\\/]+)(?:[\\/]|$)/;
const REACT = /[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/;

export type ChunkName = 'katex' | 'markdown' | 'react';

export function chunkFor(id: string): ChunkName | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (KATEX.test(id)) return 'katex';
  if (MARKDOWN.test(id)) return 'markdown';
  if (REACT.test(id)) return 'react';
  return undefined;
}
