import { defineConfig } from 'vitest/config';

/**
 * 单元测试：只测不依赖 DOM / React 的纯逻辑模块（缓存、格式化、链接分类、表单校验等），
 * 所以用 node 环境即可，不需要 jsdom。
 * 涉及打包产物、浏览器行为的回归检查仍在 tests/regressions.test.cjs（node:test，零依赖）。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
