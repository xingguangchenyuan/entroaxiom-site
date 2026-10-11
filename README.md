# entroaxiom

> 在无序的熵变中，确立世界的公理。

访客侧前端单页应用：欢迎页 + 首页 + 三个模块（文件库 / 学习笔记 / 文章总结）。Vite + React 18 + TypeScript，无组件库、无动画库、无后端。需求依据：[《ENTROAXIOM 第一阶段执行文档 v2》](../网页设计/ENTROAXIOM-前端UI与交互执行文档-v2.md)。

## 环境要求

- Node ≥ 20（开发环境实测 v22.23.3）
- 无需任何服务端 / 密钥 / 数据库

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 开发服务器（正式内容源：默认空状态） |
| `npm run dev:demo` | 开发服务器（演示内容源，页面带「演示内容」标注） |
| `npm run build` | 类型检查 + 生产构建（`tsc --noEmit && vite build`，正式内容源） |
| `npm run build:demo` | 生产构建（演示内容源） |
| `npm run preview` | 预览 `dist/` 产物 |
| `npm run images` | 用 `scripts/prepare-images.mjs` 重新生成壁纸产物（见下文「换壁纸」） |

## 内容源（演示模式开关）

构建期环境变量 `VITE_CONTENT_SOURCE` 决定内容来源（构建时静态打包，不做运行时切换）：

- `official`（**默认**）：`src/content/notes|summaries` 正式目录 + `src/content/files.ts`。当前正式内容为空，三个模块展示真实空状态。
- `demo`：`src/content/demo/` 演示内容（4 篇笔记、3 篇总结、5 个文件），页面右上出现「演示内容」标注。

`.env.example` 已提供示例；直接用命令开关即可，无需改环境：

```bash
npm run dev:demo      # 本地看演示内容
VITE_CONTENT_SOURCE=demo npm run build   # 同上，产物（等价 npm run build:demo）
```

## 项目结构

```
src/
  config/     site.ts（文案/导航/标题模板）、wallpapers.ts（壁纸配置，含 focus）
  styles/     tokens.css（设计令牌）、base.css（reset）、reading.css（正文）、components.css（组件）
  hooks/      useSessionEntered / useListQuery / useScrollRestore / useFocusTrap / useBodyScrollLock /
              usePrefersReducedMotion / useDocumentTitle
  components/ layout/（WallpaperLayer/TopNav/MobileMenu/ContentPanel/SkipLink）、welcome/、list/、
              reading/（Markdown/Toc/Lightbox）、state/（四种状态组件）
  pages/      首页 + 文件库(列表/详情) + 学习笔记(列表/详情) + 文章总结(列表/详情) + 404
  content/    frontmatter.ts、loader.ts（唯一数据出口）、files.ts、demo/、notes+summaries（正式内容目录）
```

## 路由与刷新

history 模式，路由表：

```
/                首页（欢迎层覆盖其上）
/files           文件库        /files/:id     文件详情（图片/PDF 在线预览，其余有回退）
/notes           学习笔记      /notes/:id     正文 + 右侧目录（移动端收起式）
/summaries       文章总结      /summaries/:id 同上
*                404
```

深链（如 `/notes/xxx`）直接打开目标页，不重播欢迎层。**生产部署必须配 history 回退**（见下，否则深链刷新 404）。

## 部署（Nginx 静态托管）

1. `npm run build`（或 `npm run build:demo`）→ 产物在 `dist/`。
2. 上传 `dist/` 内容到站点根目录（如 `/var/www/entroaxiom`）。
3. Nginx 配置（history 回退 + 缓存策略）：

```nginx
server {
    listen 80;
    server_name yourdomain.example;

    root /var/www/entroaxiom;
    index index.html;

    # 前端路由回退到 index.html（history 模式深链刷新不 404）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 带 hash 的静态资源：长缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 壁纸/演示资源：中缓存（换图后需刷新版本号，见「换壁纸」）
    location /media/ {
        expires 30d;
        add_header Cache-Control "public";
    }
    location /demo-assets/ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # index.html 不缓存，保证发版即时生效
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

**部署到子路径**：改两处 —— `vite.config.ts` 的 `base` 与 `src/main.tsx` 的 `<BrowserRouter basename>`（值如 `/sub/`，与 Nginx `location /sub/` 对应）。

## 换壁纸

1. 把新原图放到任意位置（建议 `WebProjects/WebPictures/`，不进 git）。
2. 运行 `node scripts/prepare-images.mjs <欢迎图路径> <网站图路径>`（可省略参数，脚本有默认路径）。脚本用 sharp 生成 desktop/mobile × avif/webp/jpg 三档产物到 `public/media/`，并打印实际尺寸与体积（质量：AVIF q50 / WebP q78 / JPEG q82，超出 1MB 自动降级，最低 q40/q70/q74）。
3. 对照产物看两眼，在 `src/config/wallpapers.ts` 里把两张图的 `focus.desktop` / `focus.mobile` 改成主体位置（`object-position` 百分比；常见竖屏裁切发生在横向，先看横向主体在哪）。
4. 重新构建；**发布时给引用加版本号强制刷新缓存**：改 `src/config/wallpapers.ts` 中四个产物路径，如 `/media/site-desktop.jpg?v=2`（Nginx 对 `/media/` 缓存 30 天）。

## 设计要点速览

- 欢迎层：首页常驻 + `position: fixed` 覆盖层，进入为真实交叉淡化；会话内只播一次（`sessionStorage`），深链接不补播；欢迎层可见时舞台 `inert`，防止导航被 Tab 聚焦。
- 搜索/分类：提交式（回车或点「搜索」，不边打边筛）；关键词 `q` 与分类 `cat` 写在 URL（`replace: true`），分享链接可复现筛选；列表返回时滚动位置与会话内恢复。
- 正文：本地 Markdown 渲染（`react-markdown` + `remark-gfm` + `rehype-slug`，不开 `rehype-raw`）；宽表格容器内横向滚动；图片点击放大（遮罩/关闭按钮/Esc 三退出 + 焦点陷阱 + 滚动锁）；TOC 由标题生成，≥3 个才显示，点击平滑定位避开固定导航。
- 无障碍：`skip-link`、`:focus-visible` 统一焦点、`prefers-reduced-motion` 全局降级、触控目标 ≥44px、`100dvh` + `env(safe-area-inset-*)`。
- 异常兜底：顶层 ErrorBoundary；三种数据状态（空 / 无结果 / 加载失败）文案不混用；未知 ID 显示「内容不存在」。

## 已知边界

- PDF 预览用 `<object>` 内嵌，极少数浏览器（如旧 iOS Safari）可能显示「无法预览」回退文案 + 下载按钮。
- 无后台：全部内容构建期打包；正式内容为空时界面即真实空状态。
- 更详细的取舍与验证记录见 [`DELIVERY.md`](./DELIVERY.md)。