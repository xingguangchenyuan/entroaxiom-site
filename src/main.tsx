import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import 'katex/dist/katex.min.css';
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
import './styles/admin.css';

// Data Router 提供可靠的 PUSH / REPLACE / 浏览器前后退拦截，不改变页面结构。
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
