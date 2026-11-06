import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
// katex 的样式跟着 Markdown 组件按需加载（见 components/reading/Markdown.tsx），不进首屏
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/glass.css';
import './styles/layout.css';
import './styles/welcome.css';
import './styles/home.css';
import './styles/lists.css';
import './styles/reading.css';
import './styles/atlas.css';
import './styles/pages.css';
import './styles/guestbook.css';
import './styles/shelf.css';
// 移动端覆盖层必须最后加载，才能盖住上面各模块的桌面版式
import './styles/mobile.css';

// Data Router 提供可靠的 PUSH / REPLACE / 浏览器前后退拦截，不改变页面结构。
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
