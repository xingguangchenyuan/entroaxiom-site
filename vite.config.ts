import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { chunkFor } from './src/lib/chunkRules';
import { applySiteUrl, normalizeSiteUrl } from './src/lib/siteUrl';

// history 路由部署在站点根路径；若将来挂到子路径，必须同时改 base 与 <BrowserRouter basename>
//
// 开发时把 /api 与 /uploads 转发给本机后端（Fastify / Node.js，默认 8000 端口），
// 这样浏览器看到的始终是同源请求，与生产（Nginx 转发）一致，Cookie 登录也能正常工作。
//
// 注意：后端地址必须在 defineConfig 回调里用 loadEnv 读取。模块顶层的
// `process.env.VITE_DEV_BACKEND` 在 Vite 加载 .env* 之前就求值了，写在
// .env.local 里的配置完全不会生效（只剩进程环境变量这一条路）。
const DEFAULT_DEV_BACKEND = 'http://127.0.0.1:8000';

// index.html 里的分享图地址必须是带域名的绝对地址：用 VITE_SITE_URL 在构建时填进去（没配置就整行删掉）
function siteMeta(siteUrl: string | undefined, isBuild: boolean): Plugin {
  return {
    name: 'entroaxiom-site-meta',
    transformIndexHtml: (html) => applySiteUrl(html, siteUrl),
    configResolved() {
      if (isBuild && !siteUrl) {
        console.warn('\n[site-meta] 未设置 VITE_SITE_URL（例如 https://example.com）：产物里不会有 og:image / twitter:image 分享图。\n');
      }
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL);
  // /api 与 /uploads 必须用同一个解析结果，否则改端口时只有一半生效
  const devBackend = env.VITE_DEV_BACKEND?.trim() || DEFAULT_DEV_BACKEND;
  return {
    base: '/',
    plugins: [react(), siteMeta(siteUrl, command === 'build')],
    build: {
      rollupOptions: {
        output: {
          // 把 Markdown/KaTeX 渲染链与 React 运行时拆成独立 chunk，首屏不必一次下完（规则见 src/lib/chunkRules.ts）
          manualChunks: chunkFor,
        },
      },
    },
    server: {
      // 工具可能先写临时文件再原子改名；.tmpdir 里的中间文件偶尔会被锁住，
      // chokidar 去 watch 它们会直接 EBUSY 把 dev server 打挂（Windows 上很常见）
      watch: { ignored: ['**/.*.tmpdir/**', '**/*.tmp'] },
      proxy: {
        '/api': { target: devBackend, changeOrigin: false },
        '/uploads': { target: devBackend, changeOrigin: false },
      },
    },
  };
});

