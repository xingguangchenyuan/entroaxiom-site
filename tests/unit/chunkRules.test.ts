import { describe, expect, it } from 'vitest';
import { chunkFor } from '../../src/lib/chunkRules';

const id = (pkg: string) => `/project/node_modules/${pkg}/index.js`;

describe('chunkFor', () => {
  it('React 运行时单独一块（首屏之外唯一值得手动切的）', () => {
    expect(chunkFor(id('react'))).toBe('react');
    expect(chunkFor(id('react-dom'))).toBe('react');
    expect(chunkFor(id('react-router-dom'))).toBe('react');
  });

  it('markdown 渲染链不再手动切块 —— 切了会让 KaTeX 跟着每篇文章一起下载', () => {
    // 原因见 src/lib/chunkRules.ts 顶部：markdown 块与 katex 块会互相依赖
    for (const pkg of ['react-markdown', 'remark-gfm', 'rehype-slug', 'mdast-util-to-hast', 'hast-util-to-text', 'unified', 'vfile', 'unist-util-visit']) {
      expect(chunkFor(id(pkg))).toBeUndefined();
    }
  });

  it('KaTeX 也不手动切块，交给 katexPlugin 那块异步块自己带走', () => {
    expect(chunkFor(id('katex'))).toBeUndefined();
    expect(chunkFor(id('rehype-katex'))).toBeUndefined();
    expect(chunkFor(id('remark-math'))).toBeUndefined();
  });

  it('兼容 Windows 路径；名字相近的无关包和业务代码不归入', () => {
    expect(chunkFor('C:\\project\\node_modules\\react-dom\\index.js')).toBe('react');
    expect(chunkFor(id('react-markdown-extra'))).toBeUndefined();
    expect(chunkFor('/project/src/lib/react-ish.ts')).toBeUndefined();
  });
});
