import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// history 路由部署在站点根路径；若将来挂到子路径，必须同时改 base 与 <BrowserRouter basename>
export default defineConfig({
  base: '/',
  plugins: [react()],
});