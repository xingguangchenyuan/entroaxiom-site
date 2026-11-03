import { describe, expect, it } from 'vitest';
import { chunkFor } from '../../src/lib/chunkRules';

const id = (pkg: string) => `/project/node_modules/${pkg}/index.js`;

describe('chunkFor', () => {
  it('Markdown 渲染链（含 vfile-message / vfile-location）归入 markdown', () => {
    for (const pkg of ['react-markdown', 'remark-gfm', 'rehype-slug', 'micromark-util-types', 'mdast-util-to-hast', 'hast-util-to-text', 'unified', 'vfile', 'vfile-message', 'vfile-location', 'unist-util-visit']) {
      expect(chunkFor(id(pkg))).toBe('markdown');
    }
  });
  it('KaTeX 和 React 各自一块', () => {
    expect(chunkFor(id('katex'))).toBe('katex');
    expect(chunkFor(id('rehype-katex'))).toBe('katex');
    expect(chunkFor(id('react-dom'))).toBe('react');
  });
  it('兼容 Windows 路径；名字相近的无关包和业务代码不归入', () => {
    expect(chunkFor('C:\\project\\node_modules\\vfile-message\\index.js')).toBe('markdown');
    expect(chunkFor(id('react-markdown-extra'))).toBeUndefined();
    expect(chunkFor('/project/src/lib/vfile-like.ts')).toBeUndefined();
  });
});
