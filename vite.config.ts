import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// history 路由部署在站点根路径；若将来挂到子路径，必须同时改 base 与 <BrowserRouter basename>
//
// 开发时把 /api 与 /uploads 转发给本机后端（uvicorn，默认 8000 端口），
// 这样浏览器看到的始终是同源请求，与生产（Nginx 转发）一致，Cookie 登录也能正常工作。
const BACKEND = process.env.VITE_DEV_BACKEND ?? 'http://127.0.0.1:8000';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: BACKEND, changeOrigin: false },
      '/uploads': { target: BACKEND, changeOrigin: false },
    },
  },
});
