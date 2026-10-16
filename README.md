# entroaxiom · 前端

> 在无序的熵变中，确立世界的公理。

神秘星系 / 黑洞 / 哲学感的个人站点前端。Vite + React 18 + TypeScript，无新增运行时依赖。
背景是一块实时渲染的 WebGL 黑洞（会随页面切换而「靠近」「远离」），界面用液态玻璃与拟物旋钮组成。

## 页面

| 路径 | 内容 |
|---|---|
| `/` | 欢迎层 → 首页（轨道、三条公理、近期轨迹、星图预览、规模读数） |
| `/notes` `/summaries` `/files` | 列表：搜索、分类筛选、排序，状态写入 URL |
| `/notes/:id` `/summaries/:id` | 阅读页：目录、阅读进度、图片灯箱、上一篇/下一篇/同星座 |
| `/files/:id` | 文件详情与预览/下载 |
| `/atlas` | 星图：内容按分类/标签/文件类型形成的力导向图，另有时间轴视图 |
| `/axioms` | 公理页（文字在 `src/config/axioms.ts`） |
| `/owner` | 站长登录 |
| `/console` | 站长控制台：概览、笔记/总结的 Markdown 编辑器（分栏预览、Ctrl+S）、文件上传与管理 |
| `Ctrl/⌘ + K` | 全站搜索面板 |

## 运行

```bash
npm ci
npm run dev          # 对接本机后端 http://127.0.0.1:8000（/api 与 /uploads 由 Vite 代理，保持同源）
npm run dev:demo     # 不需要后端，使用随包演示内容
npm run build        # 类型检查 + 构建到 dist/
npm run build:demo
npm test             # 分页、校验字段与公开内容缓存回归
```

后端端口不同时：`VITE_DEV_BACKEND=http://127.0.0.1:9000 npm run dev`。

## 与后端的对接约定（同源）

- 只请求同源 `/api/public/*`、`/api/auth/*`、`/api/admin/*`，不支持也不需要 `VITE_API_BASE`。
- 响应信封 `{success, data, error:{code,message,details}}`；公开接口 404 一律显示「内容不存在」（私密/草稿对访客不可见）。
- 访客不会触发 `/api/auth/*`：只有登录成功过的浏览器才会在启动时问一次 `/api/auth/me`。
- 站长会话是 HttpOnly Cookie，前端读不到；新建内容默认「仅自己 + 草稿」，需要手动切到「公开 + 已发布」访客才看得到。
- 生产环境用后端包内 `deploy/nginx/conf.d/site.conf` / `site-https.conf.example`：`/api` 转发到 FastAPI，`/uploads/public/` 由 Nginx 只读提供，其余上传目录不对外开放；静态页面指向 `dist/` 并配置 history 回退。不要把整个上传目录直接开放，也不要在生产关闭 Secure Cookie。

前端 ZIP 保留原来的 `site/` 根目录。若使用后端随附的 Docker Compose，请将该目录命名为 `entroaxiom-site`，与 `entroaxiom-backend` 并列，或按实际路径调整 Compose 的前端 `dist` 挂载。

## 想改什么，去哪里改

- 站名、标语、导航：`src/config/site.ts`
- 三条公理与首页哲学文案：`src/config/axioms.ts`
- 三个「世界」（笔记/总结/文件）的名称与说明：`src/config/worlds.ts`
- 颜色、字号、间距：`src/styles/tokens.css`；玻璃与旋钮：`src/styles/glass.css`
- 黑洞的形态与各页面机位：`src/components/sky/`
- 演示内容：`src/content/demo/`（仅 `dev:demo` / `build:demo` 使用）

标题字体 `Entro Serif` 是按本站界面文字裁出的子集；你在控制台写的新标题里若有子集外的汉字，会自动回退到系统宋体/思源宋体，不会缺字。

## 已验证与未验证

2026-10-16 修复版已实际通过 `npm run build`（TypeScript + Vite 5）及 `npm test`（14 项）。已连接本地真实 FastAPI 后端进行浏览器回归：已有 ID `new` 的编辑、新建保存、导航/后退的未保存提示、退出确认、422 字段高亮，以及撤回公开内容后首页和搜索更新。测试使用独立临时数据库，不触及正式数据。

原版 34 个视觉相关文件已逐一进行 SHA256 比对，样式、字体资源、首页视觉、黑洞、配置及基础 UI 组件均原样保留。确认提示复用原有组件，没有重做界面。

未验证：目标 Linux 服务器、Docker/Nginx/HTTPS 实际部署及生产环境数据迁移。构建仍有单个 JS 包超过 500 kB 的体积提示（非构建失败）；此次未做视觉或加载结构重构。
