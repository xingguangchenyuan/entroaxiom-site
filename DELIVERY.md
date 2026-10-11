# entroaxiom 第一阶段交付说明

> 交付内容：访客侧前端单页应用（欢迎页 + 首页 + 文件库 / 学习笔记 / 文章总结 三模块）。
> 需求依据：`网页设计/ENTROAXIOM-前端UI与交互执行文档-v2.md`（v2 为唯一权威，未按文档初版实现页脚 shell / 阅读清单 / 段落密度 / 欢迎路由，以 v2 为准）。

---

## 1. 环境要求与命令

- Node ≥ 20（实测 v22.23.3）；无需后端 / 密钥 / 数据库。
- 安装：`npm install`
- 开发：`npm run dev`（正式内容源）
- 演示开发：`npm run dev:demo`
- 构建：`npm run build`（`tsc --noEmit && vite build`，正式内容源）
- 演示构建：`npm run build:demo`
- 预览：`npm run preview`
- 壁纸生成：`npm run images`（等价 `node scripts/prepare-images.mjs`，支持两个 CLI 参数）

## 2. 演示模式开关

构建期环境变量 `VITE_CONTENT_SOURCE`：

- `official`（默认）：使用 `src/content/notes|summaries` + `src/content/files.ts`（当前为空 → 真实空状态）。
- `demo`：使用 `src/content/demo/` 演示内容（4 篇笔记、3 篇总结、5 个文件），页面右上显示「演示内容」标注。

直接 `npm run dev:demo` / `npm run build:demo` 即开启；`.env.example` 有示例。**正式构建绝不混入演示数据**（构建期静态打包，选择互斥）。

## 3. 替换欢迎背景 / 网站壁纸

1. 准备原图（建议放 `WebProjects/WebPictures/`，不进站点 git）。
2. `node scripts/prepare-images.mjs <欢迎图> <网站图>`（默认路径指向 `../WebPictures/` 对应文件）。脚本用 sharp 生成 desktop/mobile × avif/webp/jpg 共 12 个产物到 `public/media/`，打印实际尺寸与体积；质量 AVIF q50 / WebP q78 / JPEG q82（渐进式），单张桌面产物超出 1MB 自动逐级降 5 点，最低 AVIF q40 / WebP q70 / JPEG q74。
3. 视觉确认后，在 `src/config/wallpapers.ts` 调整两张图的 `focus.desktop` / `focus.mobile`（`object-position` 百分比）。**注意**：横版壁纸在竖屏手机会大幅裁剪，先看横向主体位置再定值。
4. 重新构建并发布；Nginx 对 `/media/` 缓存 30 天，换图后给引用加版本号（如 `/media/site-desktop.jpg?v=2`）强制刷新。

## 4. 部署（Nginx）

```nginx
server {
    listen 80;
    server_name yourdomain.example;

    root /var/www/entroaxiom;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }        # history 回退

    location /assets/      { expires 1y; add_header Cache-Control "public, immutable"; }
    location /media/       { expires 30d; add_header Cache-Control "public"; }
    location /demo-assets/ { expires 30d; add_header Cache-Control "public"; }
    location = /index.html { add_header Cache-Control "no-cache"; }
}
```

部署到子路径需同步改两处：`vite.config.ts` 的 `base` + `src/main.tsx` 的 `<BrowserRouter basename>`（值如 `/sub/`，与 Nginx `location /sub/` 对应）。

## 5. 图片产物实际尺寸与体积（均 ≤1MB，符合 §4.1）

| 产物 | 尺寸 | 体积 |
| --- | --- | --- |
| welcome-desktop.avif | 2560×1441 | 41 KB |
| welcome-desktop.webp | 2560×1441 | 81 KB |
| welcome-desktop.jpg | 2560×1441 | 159 KB |
| welcome-mobile.avif | 1280×720 | 18 KB |
| welcome-mobile.webp | 1280×720 | 31 KB |
| welcome-mobile.jpg | 1280×720 | 57 KB |
| site-desktop.avif | 2560×1436 | 110 KB |
| site-desktop.webp | 2560×1436 | 188 KB |
| site-desktop.jpg | 2560×1436 | 363 KB |
| site-mobile.avif | 1280×718 | 40 KB |
| site-mobile.webp | 1280×718 | 67 KB |
| site-mobile.jpg | 1280×718 | 122 KB |

源图：欢迎图 `C:/Users/xinguangchenyuan/Pictures/1000055228_x16_drawing.png`（6688×3764，深底亮线稿）、网站图 `D:/桌面壁纸/1774693.jpeg`（8397×4710，横版照片），本机通过 WSL 挂载路径读入（`/mnt/c/...`、`/mnt/d/...`）。源图在 Windows 侧，不进仓库；产物提交仓库，构建不依赖源图路径。脚本默认值即文档的 Windows 路径，本机执行时用 `--welcome` / `--site` 传 WSL 挂载路径。

**焦点取值依据（重要）**：实现时模型无法查看图片（当前模型不支持读图，已如实记录），因此用 sharp 探针做了像素级分析代替肉眼确认：
- 欢迎图逐带亮度近 0（深底），亮（主体）像素集中在 33%~58% 带，中位 ~46% → desktop `50% 45%`；移动竖屏几乎不裁上下（裁切发生在横向），`50% 30%` 在横屏手机上也保留主体。
- 网站图细节密度均匀（边缘强度 42~61），中位 ~63%（中下部略多）→ desktop `50% 50%`；移动 `50% 40%`（轻度上偏，兼容横屏手机）。

**→ 此项与"桌面与移动焦点需肉眼确认"（§15）标记为"未完全验证"**：像素分析支持取值合理性，但非真实人眼确认，发布前请用户对照产物更正 `focus` 值（见 §3 步骤 3）。

## 6. 已实际执行的验证清单（§15）

以下均为实际执行与实测，无勾选未执行项；无法验证的已如实标注。

**背景与资源**
- [x] 欢迎背景为第一张图、全局壁纸为第二张图；构建产物不依赖本机绝对路径（源图忽略于仓库外，产物在 `public/media/`）。
- [x] 图片产物尺寸与体积符合 §4.1（见上表，单张 ≤1MB）。
- [x] 桌面与移动焦点分别设置，取值基于像素分析（见 §5）；**肉眼确认未完成 → 标"未完全验证"**。
- [x] 壁纸加载失败显示中性底色（`--c-surface` 层兜底 + `onError` 隐藏），页面功能正常（devtools 断点验证）。

**欢迎页**
- [x] 文案逐字一致（对照文档逐字校验），居中偏上布局、按钮尺寸符合要求（`max-width` 容器 + 字号层级按设计令牌）。
- [x] 出现顺序正确、进入为真实交叉淡化（CSS transition 双向），无闪白、无强制等待、无重复触发（会话内单次）。
- [x] 欢迎层可见时首页导航无法被 Tab 聚焦（约束性舞台 `inert` 生效，实测 Tab 跳过）。
- [x] 焦点移交：进入后焦点移交 `<main tabindex="-1">`（实测）。
- [x] 壁纸未就绪也能正常进入（不阻塞、立即进入；图片加载独立于进入逻辑）。
- [x] 同一标签页刷新 / 回首页 / 切模块均不重播（`sessionStorage` 键 `entroaxiom:entered`）；深链接直接打开目标页且不补播（代码路径经路由判断验证）。

**首页与导航**
- [x] 首页仅有壁纸与导航，无个人信息、无强制卡片、无博客文章流（对照 v2 无页脚 shell / 无博客流）。
- [x] 四个导航项正确，选中态 = 颜色 + 等宽下划线 + `aria-current`；阅读页仍选中所属模块（详情页高亮所属模块，实测）。
- [x] 浏览器前进 / 后退 / 刷新正常；`/notes/xxx` 深链刷新无服务器 404 —— dev server fallback 已隐式验证，正式 Nginx `try_files` 配置已提供；**线上验证留待上线后**（本机无 Nginx，标部分验证）。

**模块与数据**
- [x] 三模块默认空状态文案正确（无内容文案互不混用）；无登录 / 上传 / 编辑 / 壁纸设置入口。
- [x] 演示模式显式开启（`dev:demo` / `build:demo`），页面有「演示内容」标注；正式构建不混入演示数据（构建期互斥，产物 diff 验证）。
- [x] 搜索、清空、分类、清除筛选均生效；"无内容"与"无结果"文案不同（实测）。
- [x] 搜索词与分类反映在 URL（`q` / `cat`，`replace: true`），分享链接可直接复现筛选（实测打开带参 URL 复现）。

**阅读与详情**
- [x] 长文显示目录且正文不被压窄（≥3 标题才显示，桌面右侧 sticky；实测），短文不显示目录（实测）；锚点定位不被导航遮挡（`scroll-margin-top` 实测）。
- [x] 图片放大可用，遮罩点击 / 关闭按钮 / Esc 三种退出均有效，焦点正确归位（实测）。
- [x] 宽表格仅在容器内横向滚动（`.table-scroll` 实测）；长文件名不撑破布局（`overflow-wrap: anywhere` 实测）。
- [x] 列表进详情返回：查询、分类、滚动位置均恢复（`useScrollRestore` + `sessionStorage` 实测）；直接打开详情返回默认列表（无筛选）。
- [x] 未知内容 ID 显示"内容不存在"并可返回（实测）。
- [x] 不支持预览的文件类型有详情回退（ZIP / DOCX / 超长名 txt 走"下载 / 无法预览"详情页），无虚假下载提示（实测）。

**移动端与可访问性**
- [x] 360 / 390 / 768 / 1440 / 1920 五个宽度均无意外横向滚动（headless 逐宽度实测）。
- [x] 移动菜单可开可关（外部点击 / Esc / 选中链接），`aria-expanded` 正确，焦点归位（实测）。
- [x] 触控目标 ≥44×44px（按钮/导航项尺寸实测）；安全区适配 `env(safe-area-inset-*)` + `viewport-fit=cover` + `100dvh` 回退 `100vh`（代码与 devtools 验证）。
- [x] 跳转链接、键盘焦点（`:focus-visible`）、Esc 关闭、`prefers-reduced-motion` 均有效（实测）。
- [x] 正文 / 摘要 / 元信息 / 导航 / 选中态对比度 —— 设计令牌抽查（正文黑 #1d2329 于 `--c-surface` 白底远超 4.5:1；导航 `--c-text-nav` 于半透明底核定）；**随机大面积实际测量未做 → 标部分验证**。

**鲁棒性与工程**
- [~] 三张临时浅色 / 深色 / 复杂背景验证导航与正文可读性 —— **未验证**：本模型无法读图（若生成临时图也无法查看渲染效果），更无法逐张肉眼核验对比度；已改为用像素分布探针评估两张实际图的主体位置与亮度（见 §5）。**此项留待人工**：换临时浅色 / 深色 / 复杂三张图各自打开页面肉眼确认后恢复指定初始图。
- [x] 未知路由显示 404 而非白屏（实测）；渲染异常由 ErrorBoundary 兜住（注入异常实测显示错误状态）。
- [x] 无后台接口、密钥、私密数据或模拟权限（代码审查确认：纯静态，无 fetch / 无凭据）。
- [x] `tsc --noEmit` 与 `npm run build`（official + demo 两源）均零报错；README 含运行 / 构建 / 部署 / 演示模式 / 换壁纸说明（见 `README.md`）。
- [x] 未引入 §12.2 红线依赖（依赖清单见下）。

## 依赖清单

**dependencies**：`react` ^18.3.1、`react-dom` ^18.3.1、`react-markdown` ^9.0.1、`react-router-dom` ^6.30.0、`rehype-slug` ^6.0.0、`remark-gfm` ^4.0.0

**devDependencies**：`vite` ^5.4.11、`typescript` ~5.6.3、`@vitejs/plugin-react` ^4.3.4、`@types/react` ^18.3.12、`@types/react-dom` ^18.3.1、`@types/node` ^22.10.0、`cross-env` ^7.0.3、`sharp` ^0.35.0（仅构建脚本用）

均为常规开源包，无组件库 / 动画库 / 状态库 / axios / moment / lodash / 图标包 / 后端 SDK（未触碰 §12.2 红线）。frontmatter 未用第三方包，自写约 30 行解析器（`src/content/frontmatter.ts`），避开 `gray-matter` 的 Buffer 兼容问题——此为本实现相对文档方案的唯一偏离，已在代码注释说明。

## 7. 已知限制与取舍

- **PDF 预览**：文件详情内嵌 `<object>` 预览（`demo-guide.pdf`），极小部分浏览器（旧 iOS Safari 等）会显示"无法预览"回退 + 下载按钮，属浏览器能力边界，非缺陷。
- **TOC 目录**：由正文标题（h2，必要时 h3）生成，短文 / 标题不足 3 个不显示——与文档一致，但目录层级深度取决于正文作者标题结构。
- **焦点肉眼确认**：见 §5 / §6，focus 值基于像素分析，发布前请肉眼复核更正。
- **对比度实测**：依据设计令牌抽查而非全量实测，正式发布前建议做一次真实渲染下的对比度扫描。
- **无后台**：内容全部构建期打包，正式内容为空即真实空状态；后续加内容 = 往 `src/content/notes|summaries` 加 md 文件 / 改 `src/content/files.ts`，重新 `npm run build`。
- **搜索范围**：各模块只搜自身内容（文档要求）；搜索为提交式（回车 / 点按钮），非边打边筛（文档要求）。
- **宽高比**：产物统一为 16:9 类（2560×~1440 / 1280×~720），非原图比例，属壁纸标准化处理的预期结果。